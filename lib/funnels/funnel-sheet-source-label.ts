import type { LeadFunnelRow } from "@/lib/db/types"

export function funnelSheetSourceLabel(
  funnel: Pick<LeadFunnelRow, "sheet_source_label" | "name">
): string {
  const custom = funnel.sheet_source_label?.trim()
  if (custom) return custom
  return funnel.name.trim()
}
