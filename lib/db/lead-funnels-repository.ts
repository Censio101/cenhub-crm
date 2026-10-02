import { randomBytes } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { LeadFunnelRow } from "@/lib/db/types"
import type { FieldMapping } from "@/lib/leads/inbound-payload"

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex")
}

export async function listLeadFunnelsForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<LeadFunnelRow[]> {
  const { data, error } = await supabase
    .from("lead_funnels")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as LeadFunnelRow[]
}

export async function getLeadFunnelById(
  supabase: SupabaseClient,
  funnelId: string
): Promise<LeadFunnelRow | null> {
  const { data, error } = await supabase
    .from("lead_funnels")
    .select("*")
    .eq("id", funnelId)
    .maybeSingle()

  if (error) throw error
  return (data as LeadFunnelRow | null) ?? null
}

export async function createLeadFunnel(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    name: string
    slug: string
    platform: LeadFunnelRow["platform"]
    fieldMapping?: FieldMapping
    enabled?: boolean
  }
): Promise<LeadFunnelRow> {
  const row = {
    organization_id: input.organizationId,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    platform: input.platform,
    webhook_secret: generateWebhookSecret(),
    field_mapping: input.fieldMapping ?? {},
    enabled: input.enabled ?? true,
  }

  const { data, error } = await supabase.from("lead_funnels").insert(row).select("*").single()

  if (error) throw error
  return data as LeadFunnelRow
}

export async function updateLeadFunnel(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string,
  patch: Partial<{
    name: string
    slug: string
    platform: LeadFunnelRow["platform"]
    fieldMapping: FieldMapping
    enabled: boolean
    webhookSecret: string
    dataFormat: LeadFunnelRow["data_format"]
  }>
): Promise<LeadFunnelRow> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.slug !== undefined) row.slug = patch.slug.trim().toLowerCase()
  if (patch.platform !== undefined) row.platform = patch.platform
  if (patch.fieldMapping !== undefined) row.field_mapping = patch.fieldMapping
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.webhookSecret !== undefined) row.webhook_secret = patch.webhookSecret
  if (patch.dataFormat !== undefined) {
    row.data_format = patch.dataFormat
    // Going back to our own names stops a running wait; the saved sample and mapping stay.
    if (patch.dataFormat === "ours") row.sample_listening_until = null
  }

  const { data, error } = await supabase
    .from("lead_funnels")
    .update(row)
    .eq("id", funnelId)
    .eq("organization_id", organizationId)
    .select("*")
    .single()

  if (error) throw error
  return data as LeadFunnelRow
}

export async function deleteLeadFunnel(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from("lead_funnels")
    .delete()
    .eq("id", funnelId)
    .eq("organization_id", organizationId)

  if (error) throw error
}

/** All sample columns cleared. */
const EMPTY_SAMPLE = {
  sample_listening_until: null,
  sample_payload: null,
  sample_received_at: null,
  sample_error: null,
} as const

/** How long a webhook waits for the sample request. */
export const SAMPLE_LISTEN_MINUTES = 5

/** True while the webhook is waiting for a sample request. */
export function isFunnelListening(
  funnel: Pick<LeadFunnelRow, "sample_listening_until">,
  now: Date = new Date()
): boolean {
  return Boolean(
    funnel.sample_listening_until &&
    new Date(funnel.sample_listening_until).getTime() > now.getTime()
  )
}

async function patchSampleColumns(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string,
  row: Record<string, unknown>
): Promise<LeadFunnelRow> {
  const { data, error } = await supabase
    .from("lead_funnels")
    .update(row)
    .eq("id", funnelId)
    .eq("organization_id", organizationId)
    .select("*")
    .single()
  if (error) throw error
  return data as LeadFunnelRow
}

/** Starts waiting for one request to use as the sample (an earlier sample stays until replaced). */
export function startFunnelSampleListening(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string
) {
  return patchSampleColumns(supabase, funnelId, organizationId, {
    sample_listening_until: new Date(Date.now() + SAMPLE_LISTEN_MINUTES * 60_000).toISOString(),
    sample_error: null,
  })
}

export function stopFunnelSampleListening(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string
) {
  return patchSampleColumns(supabase, funnelId, organizationId, {
    sample_listening_until: null,
  })
}

export function clearFunnelSample(
  supabase: SupabaseClient,
  funnelId: string,
  organizationId: string
) {
  return patchSampleColumns(supabase, funnelId, organizationId, { ...EMPTY_SAMPLE })
}

/**
 * Stores the request as the sample if the webhook is still listening. Atomic: of two
 * simultaneous requests only one gets `true`; the other must be handled as a normal lead.
 */
export async function captureFunnelSample(
  supabase: SupabaseClient,
  funnelId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase.rpc("capture_funnel_sample", {
    p_funnel_id: funnelId,
    p_payload: payload,
  })
  if (error) throw error
  return data === true
}

/** Remembers why a request could not be used as the sample (listening continues). */
export async function recordFunnelSampleError(
  supabase: SupabaseClient,
  funnelId: string,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from("lead_funnels")
    .update({ sample_error: message.slice(0, 300) })
    .eq("id", funnelId)
    .gt("sample_listening_until", new Date().toISOString())
  if (error) console.error("recordFunnelSampleError failed", error)
}
