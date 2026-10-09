import { isSameDay, startOfDay } from "date-fns"

import type { DatePreset, DateRange } from "@/lib/performance/types"

/**
 * All time (and a custom range from the first lead through today) spans the
 * full history — there is no meaningful peer period for KPI deltas.
 */
export function isDashboardComparisonAvailable(
  preset: DatePreset,
  range: DateRange,
  anchorStart?: Date | null,
  now: Date = new Date()
): boolean {
  if (preset === "all_time") return false
  if (!anchorStart) return true
  const anchor = startOfDay(anchorStart)
  const start = startOfDay(range.start)
  const end = startOfDay(range.end)
  const today = startOfDay(now)
  if (isSameDay(start, anchor) && (isSameDay(end, today) || end.getTime() >= today.getTime())) {
    return false
  }
  return true
}
