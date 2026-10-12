import { startOfDay } from "date-fns"

import type { Lead } from "@/lib/leads"
import { toIsoDate } from "@/lib/performance/date-ranges"
import type { DateRange } from "@/lib/performance/types"

export function filterWonLeadsByCloseDate(
  leads: readonly Lead[],
  range: DateRange
): Lead[] {
  const start = toIsoDate(startOfDay(range.start))
  const end = toIsoDate(startOfDay(range.end))
  return leads.filter((lead) => {
    if (lead.status !== "won") return false
    const closeDate = lead.wonDate ?? lead.date
    return closeDate >= start && closeDate <= end
  })
}

export function countWonLeadsMissingFinancials(leads: readonly Lead[]): number {
  let count = 0
  for (const lead of leads) {
    if (lead.status !== "won") continue
    const missingSales = lead.salesPrice == null || !Number.isFinite(lead.salesPrice)
    const missingProfit = lead.profit == null || !Number.isFinite(lead.profit)
    const missingLtv = lead.ltv == null || !Number.isFinite(lead.ltv)
    if (missingSales || missingProfit || missingLtv) count += 1
  }
  return count
}
