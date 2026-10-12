import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { Lead } from "@/lib/leads"

/** Name column only — visible on /leads (full green won rows) and /kunder. */
export function isMissingPriceCueColumn(col: LeadSheetTemplateColumn): boolean {
  return col.kind === "builtin" && col.builtinKey === "fullName"
}

export function missingPriceCellClass(
  lead: Lead,
  col: LeadSheetTemplateColumn
): string {
  if (!wonLeadMissingSalesPrice(lead)) return ""
  if (!isMissingPriceCueColumn(col)) return ""
  return "border-l-[3px] border-l-[#e8a317]"
}

/** Won deals without a sales price under-count revenue on the dashboard. */
export function wonLeadMissingSalesPrice(lead: Lead): boolean {
  if (lead.status !== "won") return false
  return lead.salesPrice == null || !Number.isFinite(lead.salesPrice)
}

export function countWonLeadsMissingSalesPrice(leads: readonly Lead[]): number {
  let count = 0
  for (const lead of leads) {
    if (wonLeadMissingSalesPrice(lead)) count += 1
  }
  return count
}
