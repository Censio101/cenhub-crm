import type { SupabaseClient } from "@supabase/supabase-js"

import { leadRowToLead, type LeadPatch } from "@/lib/db/lead-mapper"
import { updateLeadById } from "@/lib/db/leads-repository"
import type { LeadRow } from "@/lib/db/types"
import { clampFormSteps } from "@/lib/lead-sheet/form-steps"
import { isEmptyCustomFieldValue } from "@/lib/lead-sheet/validate"
import type { Lead } from "@/lib/leads"

/**
 * A stepped funnel form sends the same lead (same externalId) after every step. These rules
 * merge a later call into the lead that already exists:
 * - the step count only goes up, and never above the total;
 * - an empty field is always filled;
 * - a filled field is replaced only while nobody has worked on the lead yet (status still
 *   "new waiting call"), so a person's edits are never overwritten;
 * - the lead date and time stay those of the first call.
 */

const TEXT_FIELDS = [
  "fullName",
  "email",
  "phone",
  "companyName",
  "address",
  "zipCode",
  "city",
  "metaAdId",
] as const

function isUntouched(lead: Pick<Lead, "status">): boolean {
  return lead.status === "new_waiting_call"
}

export function computeStepMergePatch(
  existing: Lead,
  incoming: Lead,
  incomingCustomFields: Record<string, unknown>,
  stepsCompleted: number,
  total: number
): LeadPatch {
  const patch: LeadPatch = {}
  const untouched = isUntouched(existing)

  for (const field of TEXT_FIELDS) {
    const next = (incoming[field] ?? "").toString().trim()
    const current = (existing[field] ?? "").toString().trim()
    if (!next || next === current) continue
    if (!current || untouched) patch[field] = next
  }

  if (incoming.segment && incoming.segment !== existing.segment && (!existing.segment || untouched)) {
    patch.segment = incoming.segment
  }
  if (incoming.platform && !existing.platform) patch.platform = incoming.platform

  if (incoming.serviceIds.length > 0) {
    const same =
      incoming.serviceIds.length === existing.serviceIds.length &&
      incoming.serviceIds.every((id, i) => id === existing.serviceIds[i])
    if (!same && (existing.serviceIds.length === 0 || untouched)) {
      patch.serviceIds = incoming.serviceIds
      patch.service = incoming.service
    }
  }

  const mergedCustom: Record<string, unknown> = { ...(existing.customFields ?? {}) }
  let customChanged = false
  for (const [key, value] of Object.entries(incomingCustomFields)) {
    if (isEmptyCustomFieldValue(value)) continue
    const current = mergedCustom[key]
    if (JSON.stringify(current) === JSON.stringify(value)) continue
    if (isEmptyCustomFieldValue(current) || untouched) {
      mergedCustom[key] = value
      customChanged = true
    }
  }
  if (customChanged) patch.customFields = mergedCustom

  const nextSteps = clampFormSteps(Math.max(existing.formStepsDone ?? 0, stepsCompleted), total)
  if (nextSteps !== (existing.formStepsDone ?? null)) patch.formStepsDone = nextSteps

  return patch
}

/** Loads the existing lead and applies `computeStepMergePatch`. Returns whether anything changed. */
export async function mergeFunnelStepIntoExistingLead(
  supabase: SupabaseClient,
  organizationId: string,
  existingLeadId: string,
  incoming: Lead,
  incomingCustomFields: Record<string, unknown>,
  stepsCompleted: number,
  total: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", existingLeadId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (error || !data) return false

  const existing = leadRowToLead(data as LeadRow)
  const patch = computeStepMergePatch(existing, incoming, incomingCustomFields, stepsCompleted, total)
  if (Object.keys(patch).length === 0) return false

  await updateLeadById(supabase, organizationId, existingLeadId, patch)
  return true
}
