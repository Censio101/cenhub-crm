import type { SupabaseClient } from "@supabase/supabase-js"
import { after } from "next/server"

import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import type { LeadRow } from "@/lib/db/types"
import { isQualifiedStatus } from "@/lib/leads"
import {
  CAPI_CURRENCY,
  CAPI_MAX_ATTEMPTS,
  CAPI_MAX_EVENT_AGE_MS,
  CAPI_QUALIFIED_EVENT_NAME,
  CAPI_QUALIFIED_MAX_LEAD_AGE_MS,
  CAPI_WON_EVENT_NAME,
  buildQualifiedEvent,
  buildWonEvent,
  isEventExpired,
  isMetaLeadId,
  postCapiEvents,
  resolveEventTime,
  type CapiSendResult,
} from "@/lib/meta/conversions-api"
import { resolveMarketingAccessTokenForConfig } from "@/lib/meta/resolve-page-access-token"
import { createAdminClient } from "@/lib/supabase/admin"

export type CapiEventRow = {
  id: string
  organization_id: string
  lead_id: string
  meta_lead_id: string
  event_name: string
  event_time: string
  value: number | null
  currency: string
  status: "pending" | "sent" | "failed" | "skipped" | "expired"
  attempts: number
  last_error: string | null
  skip_reason: string | null
  created_at: string
  sent_at: string | null
}

export type CapiSkipReason = "not_from_meta" | "no_pixel"

/**
 * Runs a task after the response was sent (so saving a lead is never slowed down or failed by
 * Meta). Outside a web request (scripts) it simply runs in the background.
 */
export function runAfterResponse(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task()
    } catch (error) {
      console.error("Meta conversions task failed:", error)
    }
  }
  try {
    after(safe)
  } catch {
    void safe()
  }
}

type SendContext = { pixelId: string; token: string }
type ContextError = "switched_off" | "no_pixel" | "no_token"

async function loadSendContext(
  admin: SupabaseClient,
  organizationId: string,
  cache: Map<string, SendContext | ContextError>
): Promise<SendContext | ContextError> {
  const cached = cache.get(organizationId)
  if (cached) return cached

  const row = await getMetaConfigRow(admin, organizationId)
  let result: SendContext | ContextError
  if (!row?.capi_enabled) {
    result = "switched_off"
  } else if (!row.meta_pixel_id?.trim()) {
    result = "no_pixel"
  } else {
    const token = resolveMarketingAccessTokenForConfig(row)
    result = token ? { pixelId: row.meta_pixel_id.trim(), token } : "no_token"
  }
  cache.set(organizationId, result)
  return result
}

/** Sends one queued event and records the outcome on its row. */
export async function sendQueuedCapiEvent(
  admin: SupabaseClient,
  row: CapiEventRow,
  context: SendContext,
  now: number = Date.now()
): Promise<"sent" | "failed" | "expired"> {
  const eventTimeMs = Date.parse(row.event_time)
  if (isEventExpired(eventTimeMs, now)) {
    await admin.from("meta_capi_events").update({ status: "expired" }).eq("id", row.id)
    return "expired"
  }

  const event =
    row.event_name === CAPI_QUALIFIED_EVENT_NAME
      ? buildQualifiedEvent({ eventId: row.id, metaLeadId: row.meta_lead_id, eventTimeMs })
      : buildWonEvent({
          eventId: row.id,
          metaLeadId: row.meta_lead_id,
          eventTimeMs,
          value: Number(row.value ?? 0),
          currency: row.currency,
        })
  const result: CapiSendResult = await postCapiEvents(context.pixelId, context.token, [event])

  if (result.ok) {
    await admin
      .from("meta_capi_events")
      .update({
        status: "sent",
        sent_at: new Date(now).toISOString(),
        attempts: row.attempts + 1,
        last_error: null,
        meta_response: result.body,
      })
      .eq("id", row.id)
    return "sent"
  }

  await admin
    .from("meta_capi_events")
    .update({
      status: "failed",
      // A permanent error (for example an invalid lead ID) is not retried again.
      attempts: result.permanent ? CAPI_MAX_ATTEMPTS : row.attempts + 1,
      last_error: result.error,
      meta_response: result.body,
    })
    .eq("id", row.id)
  return "failed"
}

type MetaConfigRow = NonNullable<Awaited<ReturnType<typeof getMetaConfigRow>>>

function isFromMetaForm(lead: LeadRow) {
  return lead.source === "meta" && isMetaLeadId(lead.legacy_id)
}

/** Records one event in the outbox and tries to send it right away. */
async function enqueueEvent(
  admin: SupabaseClient,
  lead: LeadRow,
  config: MetaConfigRow,
  input: { eventName: string; value: number | null; skipReason: CapiSkipReason | null }
): Promise<void> {
  const now = Date.now()
  const eventTimeMs = resolveEventTime({
    nowMs: now,
    leadCreatedMs: lead.created_at ? Date.parse(lead.created_at) : null,
  })

  const { data, error } = await admin
    .from("meta_capi_events")
    .insert({
      organization_id: lead.organization_id,
      lead_id: lead.id,
      meta_lead_id: input.skipReason === "not_from_meta" ? "" : String(lead.legacy_id).trim(),
      event_name: input.eventName,
      event_time: new Date(eventTimeMs).toISOString(),
      value: input.value,
      currency: CAPI_CURRENCY,
      status: input.skipReason ? "skipped" : "pending",
      skip_reason: input.skipReason,
    })
    .select("*")
    .single()

  // 23505 = this lead already has this event: never send twice.
  if (error) {
    if (error.code === "23505") return
    throw error
  }
  if (input.skipReason) return

  const context = await loadSendContext(admin, config.organization_id, new Map())
  if (typeof context === "string") return
  await sendQueuedCapiEvent(admin, data as CapiEventRow, context, now)
}

/**
 * Called when a lead is saved. If it is a Meta lead that is now Won with a sales price, queue one
 * event for Meta and try to send it right away. Does nothing when the switch is off.
 */
export async function queueWonLeadEvent(lead: LeadRow): Promise<void> {
  if (lead.status !== "won") return

  const admin = createAdminClient()
  const config = await getMetaConfigRow(admin, lead.organization_id)
  if (!config?.capi_enabled) return

  const value = lead.sales_price
  const hasValue = value != null && Number.isFinite(Number(value)) && Number(value) > 0

  let skipReason: CapiSkipReason | null = null
  if (!isFromMetaForm(lead)) skipReason = "not_from_meta"
  else if (!config.meta_pixel_id?.trim()) skipReason = "no_pixel"
  // No price yet: nothing to send. The event is queued when the price is filled in.
  if (!skipReason && !hasValue) return

  await enqueueEvent(admin, lead, config, {
    eventName: CAPI_WON_EVENT_NAME,
    value: hasValue ? Number(value) : null,
    skipReason,
  })
}

/**
 * Called when a lead is saved. The first time a Meta lead reaches a qualified step, queue one
 * "Qualified" event. `previousStatus` is the status before this save (null for a new lead), so
 * editing an already qualified lead sends nothing. Leads that did not come from a Meta form, and
 * leads older than 28 days (too late to help Meta), are ignored without a trace.
 */
export async function queueQualifiedLeadEvent(
  lead: LeadRow,
  previousStatus: string | null
): Promise<void> {
  if (!isQualifiedStatus(lead.status) || isQualifiedStatus(previousStatus)) return
  if (!isFromMetaForm(lead)) return
  const createdMs = lead.created_at ? Date.parse(lead.created_at) : NaN
  if (Number.isFinite(createdMs) && Date.now() - createdMs > CAPI_QUALIFIED_MAX_LEAD_AGE_MS) return

  const admin = createAdminClient()
  const config = await getMetaConfigRow(admin, lead.organization_id)
  if (!config?.capi_enabled || !config.meta_pixel_id?.trim()) return

  await enqueueEvent(admin, lead, config, {
    eventName: CAPI_QUALIFIED_EVENT_NAME,
    value: null,
    skipReason: null,
  })
}

/**
 * Fire-and-forget wrapper used from the lead save paths; never throws. Qualified goes first so
 * that a lead that jumps straight to Won reports both stages in order.
 */
export function queueLeadStageEventsAfterResponse(lead: LeadRow, previousStatus: string | null) {
  const mayQualify = isQualifiedStatus(lead.status) && !isQualifiedStatus(previousStatus)
  if (lead.status !== "won" && !mayQualify) return
  runAfterResponse(async () => {
    await queueQualifiedLeadEvent(lead, previousStatus)
    await queueWonLeadEvent(lead)
  })
}

export type CapiFlushResult = {
  sent: number
  failed: number
  expired: number
  switchedOff: number
  waiting: number
}

/** Retries events that are still pending or failed. Run by the hourly cron. */
export async function flushPendingCapiEvents(
  admin: SupabaseClient,
  options: { limit?: number; now?: number } = {}
): Promise<CapiFlushResult> {
  const now = options.now ?? Date.now()
  const result: CapiFlushResult = { sent: 0, failed: 0, expired: 0, switchedOff: 0, waiting: 0 }

  // Anything older than Meta's 7 day limit can no longer be accepted.
  const cutoff = new Date(now - CAPI_MAX_EVENT_AGE_MS).toISOString()
  const { data: stale } = await admin
    .from("meta_capi_events")
    .update({ status: "expired" })
    .in("status", ["pending", "failed"])
    .lt("event_time", cutoff)
    .select("id")
  result.expired += stale?.length ?? 0

  const { data, error } = await admin
    .from("meta_capi_events")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", CAPI_MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(options.limit ?? 200)
  if (error) throw error

  const cache = new Map<string, SendContext | ContextError>()
  for (const row of (data ?? []) as CapiEventRow[]) {
    const context = await loadSendContext(admin, row.organization_id, cache)
    if (context === "switched_off") {
      await admin
        .from("meta_capi_events")
        .update({ status: "skipped", skip_reason: "switched_off" })
        .eq("id", row.id)
      result.switchedOff += 1
      continue
    }
    if (typeof context === "string") {
      // No pixel or token right now: keep it and try again next hour.
      result.waiting += 1
      continue
    }
    const outcome = await sendQueuedCapiEvent(admin, row, context, now)
    if (outcome === "sent") result.sent += 1
    else if (outcome === "expired") result.expired += 1
    else result.failed += 1
  }
  return result
}

export type CapiOverview = {
  counts: Record<CapiEventRow["status"], number>
  recent: Array<CapiEventRow & { lead_name: string }>
}

/** Counts and the latest events for the client's Meta settings page. */
export async function getCapiOverview(
  admin: SupabaseClient,
  organizationId: string,
  limit = 20
): Promise<CapiOverview> {
  const statuses: CapiEventRow["status"][] = ["pending", "sent", "failed", "skipped", "expired"]
  const counts = { pending: 0, sent: 0, failed: 0, skipped: 0, expired: 0 }

  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await admin
        .from("meta_capi_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", status)
      counts[status] = count ?? 0
    })
  )

  const { data, error } = await admin
    .from("meta_capi_events")
    .select("*, leads ( full_name )")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error

  const recent = ((data ?? []) as Array<CapiEventRow & { leads?: { full_name: string } | null }>).map(
    ({ leads, ...row }) => ({ ...row, lead_name: leads?.full_name ?? "" })
  )
  return { counts, recent }
}

/**
 * Sends one event to the client's Test events tab in Meta (nothing reaches real reporting), using
 * the most recent lead that came from a Meta form. For checking the setup.
 */
export async function sendCapiTestEvent(
  admin: SupabaseClient,
  organizationId: string,
  testEventCode: string
): Promise<{ ok: boolean; message: string }> {
  const row = await getMetaConfigRow(admin, organizationId)
  const pixelId = row?.meta_pixel_id?.trim() ?? ""
  if (!row || !pixelId) return { ok: false, message: "Choose a pixel first." }
  const token = resolveMarketingAccessTokenForConfig(row)
  if (!token) return { ok: false, message: "No Meta access token is configured." }

  const { data } = await admin
    .from("leads")
    .select("legacy_id, created_at")
    .eq("organization_id", organizationId)
    .eq("source", "meta")
    .not("legacy_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25)
  const lead = (data ?? []).find((candidate) => isMetaLeadId(candidate.legacy_id as string))
  if (!lead) return { ok: false, message: "This client has no lead from a Meta form yet." }

  const now = Date.now()
  const base = {
    metaLeadId: String(lead.legacy_id).trim(),
    eventTimeMs: resolveEventTime({ nowMs: now, leadCreatedMs: Date.parse(String(lead.created_at)) }),
  }
  // Both events a real lead produces: it qualifies, then it is won.
  const events = [
    buildQualifiedEvent({ ...base, eventId: `test-q-${now}` }),
    buildWonEvent({ ...base, eventId: `test-w-${now}`, value: 1 }),
  ]
  const result = await postCapiEvents(pixelId, token, events, { testEventCode })
  return result.ok
    ? { ok: true, message: "Test events sent (Qualified and Purchase). Open Events Manager > Test events to see them." }
    : { ok: false, message: result.error ?? "Meta rejected the test event." }
}
