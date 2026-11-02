import { filterDashboardLeads, type Lead } from "@/lib/leads"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"
import type { DateRange } from "@/lib/performance/types"

/**
 * How many leads filled a stepped form only partly, created in the selected period and matching
 * the dashboard's service, source and segment filters. These leads are left out of every other
 * dashboard number; this is their own metric.
 */
export function partialLeadCount(
  partialLeads: readonly Lead[],
  range: DateRange,
  filters: {
    service?: ServiceId | null
    funnel?: FunnelId | null
    segment?: CustomerSegmentId | null
  } = {}
): number {
  return filterDashboardLeads(partialLeads, {
    range,
    service: filters.service,
    funnel: filters.funnel,
    segment: filters.segment,
  }).length
}
