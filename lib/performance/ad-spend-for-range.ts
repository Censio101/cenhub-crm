import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  max,
  min,
  startOfDay,
  startOfMonth,
} from "date-fns"

import { monthKeyFromDate } from "./demo-ad-spend"
import { toIsoDate } from "./date-ranges"
import type { DateRange } from "./types"

/** Calendar months (YYYY-MM) that overlap the dashboard date range. */
export function monthKeysInRange(range: DateRange): string[] {
  const start = startOfMonth(range.start)
  const end = startOfMonth(range.end)
  if (start > end) return []
  return eachMonthOfInterval({ start, end }).map((month) =>
    monthKeyFromDate(toIsoDate(month))
  )
}

/**
 * Days Meta's monthly insight row represents for this month key.
 * Completed months: full calendar month. Current month: month-to-date (matches Meta / analytics.censio.dk).
 */
export function metaMonthPeriodDays(monthKey: string, referenceDate = new Date()): number {
  const monthStart = startOfMonth(new Date(`${monthKey}-01T00:00:00`))
  const monthEnd = endOfMonth(monthStart)
  const currentKey = monthKeyFromDate(toIsoDate(referenceDate))
  if (monthKey === currentKey) {
    return differenceInCalendarDays(endOfDay(referenceDate), monthStart) + 1
  }
  if (monthStart > startOfDay(referenceDate)) return 0
  return differenceInCalendarDays(monthEnd, monthStart) + 1
}

/** Scale synced monthly spend when the dashboard range covers only part of Meta's month row. */
export function proratedMonthlySpend(
  monthKey: string,
  spend: number,
  range: DateRange,
  referenceDate = new Date()
): number {
  if (!Number.isFinite(spend) || spend <= 0) return 0

  const monthStart = startOfMonth(new Date(`${monthKey}-01T00:00:00`))
  const monthEnd = endOfMonth(monthStart)
  const overlapStart = max([startOfDay(range.start), monthStart])
  const overlapEnd = min([endOfDay(range.end), monthEnd])
  if (overlapStart > overlapEnd) return 0

  const periodDays = metaMonthPeriodDays(monthKey, referenceDate)
  if (periodDays <= 0) return 0

  const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1
  return spend * (overlapDays / periodDays)
}

/** Raw synced monthly spend keyed by month, prorated to the active dashboard range. */
export function adSpendForRange(
  adSpendByMonth: Record<string, number>,
  range: DateRange
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const monthKey of monthKeysInRange(range)) {
    const raw = adSpendByMonth[monthKey]
    if (raw == null || raw <= 0) continue
    const prorated = proratedMonthlySpend(monthKey, raw, range)
    if (prorated > 0) out[monthKey] = prorated
  }
  return out
}
