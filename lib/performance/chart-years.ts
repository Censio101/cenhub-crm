import type { Lead } from "@/lib/leads"

/** Calendar years that have at least one lead or ad-spend month (for chart year tabs). */
export function chartYearsFromData(
  leads: readonly Lead[],
  adSpendByMonth: Record<string, number>
): number[] {
  const years = new Set<number>()
  for (const lead of leads) {
    if (!lead.date) continue
    const y = Number(lead.date.slice(0, 4))
    if (Number.isFinite(y)) years.add(y)
  }
  for (const key of Object.keys(adSpendByMonth)) {
    const y = Number(key.slice(0, 4))
    if (Number.isFinite(y)) years.add(y)
  }
  return [...years].sort((a, b) => a - b)
}
