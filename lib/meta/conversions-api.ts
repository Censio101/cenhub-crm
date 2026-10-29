import { GRAPH_VERSION } from "@/lib/meta/token"

/**
 * Meta Conversions API for CRM ("Conversion Leads"): tells Meta that a lead that came from one of
 * its Instant Forms became a customer, and what it was worth, using the Meta lead ID.
 * Payload rules: https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/payload-specification/
 */

/** Event name for a won lead (a standard event that carries a value). */
export const CAPI_WON_EVENT_NAME = "Purchase"
/** Event name for a lead that became qualified (a stage event without a value). */
export const CAPI_QUALIFIED_EVENT_NAME = "Qualified"
/** A qualified signal only helps Meta within about 28 days of the lead, so older leads are skipped. */
export const CAPI_QUALIFIED_MAX_LEAD_AGE_MS = 28 * 24 * 60 * 60 * 1000
/** Shown in Meta as the system the lead stages come from. */
export const CAPI_LEAD_EVENT_SOURCE = "Censio CRM"
export const CAPI_CURRENCY = "DKK"

/** Meta accepts events up to 7 days old; stop a little earlier so a retry never lands outside. */
export const CAPI_MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000
/** Give up on an event after this many failed tries. */
export const CAPI_MAX_ATTEMPTS = 60

/** A Meta lead ID is a 15 to 17 digit number (the `leadgen_id` of the lead). */
export function isMetaLeadId(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{15,17}$/.test(value.trim())
}

export type CapiEvent = {
  event_name: string
  event_time: number
  event_id: string
  action_source: "system_generated"
  user_data: { lead_id: string }
  custom_data: {
    event_source: "crm"
    lead_event_source: string
    value?: number
    currency?: string
  }
}

/** The event for a lead that was won. `lead_id` is sent as text so a 17 digit ID never loses digits. */
export function buildWonEvent(input: {
  eventId: string
  metaLeadId: string
  eventTimeMs: number
  value: number
  currency?: string
  leadEventSource?: string
}): CapiEvent {
  return {
    event_name: CAPI_WON_EVENT_NAME,
    event_time: Math.floor(input.eventTimeMs / 1000),
    event_id: input.eventId,
    action_source: "system_generated",
    user_data: { lead_id: input.metaLeadId.trim() },
    custom_data: {
      event_source: "crm",
      lead_event_source: input.leadEventSource ?? CAPI_LEAD_EVENT_SOURCE,
      value: input.value,
      currency: input.currency ?? CAPI_CURRENCY,
    },
  }
}

/** The event for a lead that became qualified: same as a won event, but without a value. */
export function buildQualifiedEvent(input: {
  eventId: string
  metaLeadId: string
  eventTimeMs: number
  leadEventSource?: string
}): CapiEvent {
  return {
    event_name: CAPI_QUALIFIED_EVENT_NAME,
    event_time: Math.floor(input.eventTimeMs / 1000),
    event_id: input.eventId,
    action_source: "system_generated",
    user_data: { lead_id: input.metaLeadId.trim() },
    custom_data: {
      event_source: "crm",
      lead_event_source: input.leadEventSource ?? CAPI_LEAD_EVENT_SOURCE,
    },
  }
}

/**
 * When the event counts as having happened. It must be after the lead was created (Meta discards
 * earlier events) and no older than 7 days when sent.
 */
export function resolveEventTime(input: {
  nowMs: number
  leadCreatedMs: number | null
}): number {
  const earliest = input.leadCreatedMs != null ? input.leadCreatedMs + 1000 : 0
  return Math.max(input.nowMs, earliest)
}

export function isEventExpired(eventTimeMs: number, nowMs: number): boolean {
  return nowMs - eventTimeMs > CAPI_MAX_EVENT_AGE_MS
}

export type CapiSendResult = {
  ok: boolean
  status: number
  body: unknown
  error: string | null
  /** True when retrying the same event cannot succeed (for example an invalid lead ID). */
  permanent: boolean
}

type MetaErrorBody = { error?: { message?: string; code?: number; error_subcode?: number } }

/** Invalid parameter (code 100) will not fix itself on retry; other errors may be temporary. */
export function isPermanentCapiError(body: unknown): boolean {
  const error = (body as MetaErrorBody | null)?.error
  return error?.code === 100
}

/** Posts events to the client's pixel (dataset). Pass `testEventCode` to see them only in Test events. */
export async function postCapiEvents(
  pixelId: string,
  accessToken: string,
  events: CapiEvent[],
  options: { testEventCode?: string } = {}
): Promise<CapiSendResult> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId.trim())}/events`
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        data: events,
        access_token: accessToken,
        ...(options.testEventCode ? { test_event_code: options.testEventCode.trim() } : {}),
      }),
    })
    const body = (await response.json().catch(() => ({}))) as MetaErrorBody & {
      events_received?: number
    }
    if (!response.ok || body.error) {
      return {
        ok: false,
        status: response.status,
        body,
        error: body.error?.message ?? `Meta answered ${response.status}`,
        permanent: isPermanentCapiError(body),
      }
    }
    return { ok: true, status: response.status, body, error: null, permanent: false }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : "Could not reach Meta",
      permanent: false,
    }
  }
}
