import type { SupabaseClient } from "@supabase/supabase-js"

import { leadRowToLead, type LeadPatch } from "@/lib/db/lead-mapper"
import { updateLeadById } from "@/lib/db/leads-repository"
import type { LeadRow } from "@/lib/db/types"
import type { Lead } from "@/lib/leads"

/** Meta Lead Ads id (Make often sends this as metaAdId when externalId is omitted). */
export function metaLeadgenLegacyId(value: string | undefined): string | null {
  const id = value?.trim() ?? ""
  return /^\d{8,}$/.test(id) ? id : null
}

/**
 * When Meta instant-forms already created a lead (legacy_id = leadgen id, often no service),
 * merge Make/funnel webhook fields into that row instead of inserting a second lead.
 */
export async function mergeFunnelWebhookIntoExistingMetaLead(
  supabase: SupabaseClient,
  organizationId: string,
  existingLeadId: string,
  incoming: Lead,
  customFields: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", existingLeadId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (error || !data) return false

  const existing = leadRowToLead(data as LeadRow)
  const patch: LeadPatch = {}

  if (incoming.serviceIds.length > 0 && existing.serviceIds.length === 0) {
    patch.serviceIds = incoming.serviceIds
    patch.service = incoming.service
  }
  if (incoming.platform && !existing.platform) patch.platform = incoming.platform
  if (incoming.address && !existing.address) patch.address = incoming.address
  if (incoming.zipCode && !existing.zipCode) patch.zipCode = incoming.zipCode
  if (incoming.city && !existing.city) patch.city = incoming.city

  if (Object.keys(customFields).length > 0) {
    patch.customFields = { ...(existing.customFields ?? {}), ...customFields }
  }

  if (Object.keys(patch).length === 0) return false
  await updateLeadById(supabase, organizationId, existingLeadId, patch)
  return true
}
