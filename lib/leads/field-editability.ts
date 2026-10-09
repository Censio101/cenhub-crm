import type { LeadPatch } from "@/lib/db/lead-mapper"
import { isLeadFieldLocked } from "@/lib/db/lead-mapper"
import type { Lead } from "@/lib/leads"
import { leadFieldHasValue } from "@/lib/leads/lead-field-values"

export { leadFieldHasValue } from "@/lib/leads/lead-field-values"

/**
 * Sheet and edit dialog: fields with data are always editable.
 * Company may also be edited when segment is business, or when it already has a name (even on private).
 */
export function isLeadFieldEditableInCrm(lead: Lead, field: keyof LeadPatch): boolean {
  if (field === "companyName") {
    return lead.segment === "b2b" || leadFieldHasValue(lead, "companyName")
  }

  if (isLeadFieldLocked(lead, field)) {
    return leadFieldHasValue(lead, field)
  }

  return true
}
