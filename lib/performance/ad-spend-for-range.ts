import {
  differenceInCalendarDays,
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
  // Count year/month numbers instead of stepping Dates: stepping across decades (all time starts
  // in 2000) can drift by an hour in time zones with past DST changes and drop the last month.
  const keys: string[] = []
  let year = range.start.getFullYear()
  let month = range.start.getMonth()
  const endYear = range.end.getFullYear()
  const endMonth = range.end.getMonth()
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month + 1).padStart(2, "0")}`)
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return keys
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
  // Days that have not happened yet carry no spend (the row only covers up to today).
  const overlapEnd = min([endOfDay(range.end), monthEnd, endOfDay(referenceDate)])
  if (overlapStart > overlapEnd) return 0

  const periodDays = metaMonthPeriodDays(monthKey, referenceDate)
  if (periodDays <= 0) return 0

  const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1
  return spend * (overlapDays / periodDays)
}

function monthKeyOfDay(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Ad spend for every calendar day of `range`, keyed by ISO date.
 *
 * Meta gives one number per month, so each day of a month gets an equal share of it. A completed
 * month is split over all its days; the current month's row is month-to-date, so it is split over
 * the days elapsed. Days after today get nothing. This does not depend on leads at all: a day
 * without leads still has spend, and the sum over a range is exactly the ad budget for it.
 */
export function dailyAdSpend(
  range: DateRange,
  adSpendByMonth: Record<string, number>,
  now: Date = new Date()
): Map<string, number> {
  const out = new Map<string, number>()
  const today = endOfDay(now)
  const periodDaysByMonth = new Map<string, number>()

  // Step by year/month/day numbers, not by adding to a Date, so long ranges cannot drift.
  const first = startOfDay(range.start)
  for (
    let day = first;
    day <= range.end && day <= today;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    const key = monthKeyOfDay(day)
    const monthSpend = adSpendByMonth[key]
    if (monthSpend == null || !Number.isFinite(monthSpend) || monthSpend <= 0) continue

    let periodDays = periodDaysByMonth.get(key)
    if (periodDays === undefined) {
      periodDays = metaMonthPeriodDays(key, now)
      periodDaysByMonth.set(key, periodDays)
    }
    if (periodDays <= 0) continue
    out.set(toIsoDate(day), monthSpend / periodDays)
  }
  return out
}

/** Synced monthly spend keyed by month, limited to the days of the active dashboard range. */
export function adSpendForRange(
  adSpendByMonth: Record<string, number>,
  range: DateRange,
  now: Date = new Date()
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [isoDate, amount] of dailyAdSpend(range, adSpendByMonth, now)) {
    const key = isoDate.slice(0, 7)
    out[key] = (out[key] ?? 0) + amount
  }
  return out
}
