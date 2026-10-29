import { startOfDay } from "date-fns"

import {
  computeLeadPipelineStats,
  filterDashboardLeads,
  type Lead,
  type LeadPipelineStats,
} from "@/lib/leads"
import { toIsoDate } from "@/lib/performance/date-ranges"
import type { DateRange } from "@/lib/performance/types"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"

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

/**
 * Homepage pipeline: open and lost are leads created in the period. Won (count, value, close
 * rate) uses the close date, the same rule as the Closed customers card, so the two agree.
 */
export function dashboardPipelineStats(
  leads: readonly Lead[],
  range: DateRange,
  filters: {
    service?: ServiceId | null
    funnel?: FunnelId | null
    segment?: CustomerSegmentId | null
  } = {}
): LeadPipelineStats {
  const scope = {
    service: filters.service,
    funnel: filters.funnel,
    segment: filters.segment,
  }
  const created = filterDashboardLeads(leads, { range, ...scope })
  const closed = filterDashboardLeads(filterWonLeadsByCloseDate(leads, range), {
    ignoreDate: true,
    ...scope,
  })
  const createdStats = computeLeadPipelineStats(created)
  const closedStats = computeLeadPipelineStats(closed)
  return {
    ...createdStats,
    wonCount: closedStats.wonCount,
    wonValue: closedStats.wonValue,
    averageWonSales: closedStats.averageWonSales,
    averageWonProfit: closedStats.averageWonProfit,
    closeRate:
      createdStats.totalCount === 0 ? null : (closed.length / createdStats.totalCount) * 100,
  }
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
