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

  const { data, error } = await supabase
    .from("lead_funnels")
    .insert(row)
    .select("*")
    .single()

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
  }>
): Promise<LeadFunnelRow> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.slug !== undefined) row.slug = patch.slug.trim().toLowerCase()
  if (patch.platform !== undefined) row.platform = patch.platform
  if (patch.fieldMapping !== undefined) row.field_mapping = patch.fieldMapping
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.webhookSecret !== undefined) row.webhook_secret = patch.webhookSecret

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

export async function logLeadInboundEvent(
  supabase: SupabaseClient,
  input: {
    funnelId: string
    organizationId: string
    statusCode: number
    errorMessage?: string
    payload?: unknown
  }
): Promise<void> {
  const { error } = await supabase.from("lead_inbound_events").insert({
    funnel_id: input.funnelId,
    organization_id: input.organizationId,
    status_code: input.statusCode,
    error_message: input.errorMessage ?? null,
    payload: input.payload ?? null,
  })
  if (error) {
    console.error("lead_inbound_events insert failed", error)
  }
}
