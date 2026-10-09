import {
  differenceInCalendarDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns"

import type { MessageKey } from "@/lib/i18n"
import type { DatePreset, DateRange } from "@/lib/performance/types"

/** True when the range is a full calendar month (e.g. last month preset). */
export function isFullCalendarMonth(range: DateRange): boolean {
  const start = startOfDay(range.start)
  const end = startOfDay(range.end)
  if (!isSameMonth(start, end)) return false
  return isSameDay(start, startOfMonth(start)) && isSameDay(end, endOfMonth(end))
}

/** True when the range sits inside a single calendar month (e.g. this month so far). */
export function isWithinSingleCalendarMonth(range: DateRange): boolean {
  return isSameMonth(range.start, range.end)
}

export function inclusiveRangeDays(range: DateRange): number {
  return differenceInCalendarDays(range.end, range.start) + 1
}

/**
 * Plain-language label for "previous period" comparison, based on what the user selected.
 */
export function previousComparisonMessageKey(
  range: DateRange,
  preset: DatePreset
): MessageKey {
  if (preset === "last_month" || preset === "this_month") {
    return "comparePreviousMonth"
  }
  if (preset === "last_30_days") {
    return "comparePrevious30Days"
  }
  if (isFullCalendarMonth(range)) {
    return "comparePreviousMonth"
  }
  const days = inclusiveRangeDays(range)
  if (isWithinSingleCalendarMonth(range) && days <= 31) {
    return "comparePreviousMonth"
  }
  return "comparePreviousPeriod"
}

export function comparisonModeMenuLabel(
  mode: "previous_period" | "previous_year" | "custom",
  range: DateRange,
  preset: DatePreset
): MessageKey {
  if (mode === "previous_year") return "comparePreviousYear"
  if (mode === "custom") return "compareCustom"
  return previousComparisonMessageKey(range, preset)
}
