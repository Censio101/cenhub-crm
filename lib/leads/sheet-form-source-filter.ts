import type { Lead } from "@/lib/leads"

/** Distinct form labels on leads (webhook / import tagging). */
export function distinctLeadFormSourceLabels(leads: readonly Pick<Lead, "funnelSourceLabel">[]): string[] {
  const labels = new Set<string>()
  for (const lead of leads) {
    const label = lead.funnelSourceLabel?.trim()
    if (label) labels.add(label)
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "da"))
}

/** Show the Form filter when more than one form source appears in the current lead list. */
export function shouldShowLeadFormSourceFilter(
  leads: readonly Pick<Lead, "funnelSourceLabel">[]
): boolean {
  return distinctLeadFormSourceLabels(leads).length > 1
}

export function matchesLeadFormSourceFilter(
  lead: Pick<Lead, "funnelSourceLabel">,
  selected: string | "all"
): boolean {
  if (selected === "all") return true
  return (lead.funnelSourceLabel?.trim() ?? "") === selected
}
