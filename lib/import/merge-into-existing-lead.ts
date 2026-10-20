import type { SupabaseClient } from "@supabase/supabase-js"

import { leadRowToLead, type LeadPatch } from "@/lib/db/lead-mapper"
import { updateLeadById } from "@/lib/db/leads-repository"
import type { LeadRow } from "@/lib/db/types"
import type { Lead } from "@/lib/leads"

/** Fill empty CRM fields from a spreadsheet row. Does not overwrite non-empty values. */
export function buildImportMergePatch(existing: Lead, incoming: Lead): LeadPatch | null {
  const patch: LeadPatch = {}
  const incomingCustom = incoming.customFields ?? {}

  if (incoming.serviceIds.length > 0 && existing.serviceIds.length === 0) {
    patch.serviceIds = incoming.serviceIds
    patch.service = incoming.service
  }
  if (incoming.address && !existing.address) patch.address = incoming.address
  if (incoming.zipCode && !existing.zipCode) patch.zipCode = incoming.zipCode
  if (incoming.city && !existing.city) patch.city = incoming.city
  if (incoming.fullName && !existing.fullName) patch.fullName = incoming.fullName

  if (Object.keys(incomingCustom).length > 0) {
    const merged = { ...(existing.customFields ?? {}) }
    for (const [key, value] of Object.entries(incomingCustom)) {
      const cur = merged[key]
      if (cur === undefined || cur === null || cur === "") merged[key] = value
    }
    if (JSON.stringify(merged) !== JSON.stringify(existing.customFields ?? {})) {
      patch.customFields = merged
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}

/**
 * When import skips a duplicate contact, fill empty CRM fields from the spreadsheet row
 * (service, address, custom columns). Does not overwrite non-empty values.
 */
export async function mergeImportRowIntoExistingLead(
  supabase: SupabaseClient,
  organizationId: string,
  existingLeadId: string,
  incoming: Lead,
  options: { dryRun?: boolean } = {}
): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", existingLeadId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (error || !data) return false

  const existing = leadRowToLead(data as LeadRow)
  const patch = buildImportMergePatch(existing, incoming)
  if (!patch) return false
  if (options.dryRun) return true
  await updateLeadById(supabase, organizationId, existingLeadId, patch)
  return true
}
