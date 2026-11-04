import type { Lead } from "@/lib/leads"
import type { FunnelFormViewConfig } from "@/lib/leads/funnel-sheet-column-profile"

/** Distinct Leadformular labels from enabled funnels (stable before leads load). */
export function distinctLeadFormSourceLabelsFromConfig(
  views: readonly FunnelFormViewConfig[]
): string[] {
  const labels = new Set<string>()
  for (const view of views) {
    const label = view.label.trim()
    if (label) labels.add(label)
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "da"))
}

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

export function shouldShowLeadFormSourceFilterFromConfig(
  views: readonly FunnelFormViewConfig[]
): boolean {
  return distinctLeadFormSourceLabelsFromConfig(views).length > 1
}

/** Config labels first; lead-only labels (legacy rows) are merged in. */
export function leadFormSourceFilterOptions(
  views: readonly FunnelFormViewConfig[],
  leads: readonly Pick<Lead, "funnelSourceLabel">[]
): string[] {
  const labels = new Set([
    ...distinctLeadFormSourceLabelsFromConfig(views),
    ...distinctLeadFormSourceLabels(leads),
  ])
  return [...labels].sort((a, b) => a.localeCompare(b, "da"))
}

export function shouldShowLeadFormSourceFilterForSheet(
  views: readonly FunnelFormViewConfig[],
  leads: readonly Pick<Lead, "funnelSourceLabel">[]
): boolean {
  return (
    shouldShowLeadFormSourceFilterFromConfig(views) ||
    shouldShowLeadFormSourceFilter(leads)
  )
}

export function matchesLeadFormSourceFilter(
  lead: Pick<Lead, "funnelSourceLabel">,
  selected: string | "all"
): boolean {
  if (selected === "all") return true
  return (lead.funnelSourceLabel?.trim() ?? "") === selected
}
