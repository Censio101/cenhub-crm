import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"

import type {
  ComparisonMode,
  DatePreset,
  DateRange,
  Granularity,
} from "./types"

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "this_month", label: "Denne måned" },
  { id: "last_month", label: "Sidste måned" },
  { id: "last_30_days", label: "Seneste 30 dage" },
  { id: "last_3_months", label: "Seneste 3 måneder" },
  { id: "last_6_months", label: "Seneste 6 måneder" },
  { id: "ytd", label: "År til dato" },
  { id: "last_12_months", label: "Seneste 12 måneder" },
  { id: "custom", label: "Tilpasset periode" },
]

export function resolvePreset(
  preset: DatePreset,
  now: Date = new Date()
): DateRange {
  const today = endOfDay(now)

  switch (preset) {
    case "this_month":
      return { start: startOfMonth(now), end: today }
    case "last_month": {
      const previous = subMonths(now, 1)
      return { start: startOfMonth(previous), end: endOfMonth(previous) }
    }
    case "last_30_days":
      return { start: startOfDay(subDays(now, 29)), end: today }
    case "last_3_months":
      return { start: startOfDay(subMonths(now, 3)), end: today }
    case "last_6_months":
      return { start: startOfDay(subMonths(now, 6)), end: today }
    case "ytd":
      return { start: startOfYear(now), end: today }
    case "last_12_months":
      return { start: startOfDay(subMonths(now, 12)), end: today }
    case "custom":
      return { start: startOfYear(now), end: today }
  }
}

export function previousPeriod(range: DateRange): DateRange {
  const currentStart = startOfDay(range.start)
  const currentEnd = startOfDay(range.end)
  const inclusiveDays = differenceInCalendarDays(currentEnd, currentStart) + 1
  const end = subDays(currentStart, 1)
  const start = subDays(end, inclusiveDays - 1)
  return { start: startOfDay(start), end: endOfDay(end) }
}

export function previousYear(range: DateRange): DateRange {
  return {
    start: startOfDay(subYears(range.start, 1)),
    end: endOfDay(subYears(range.end, 1)),
  }
}

export function resolveComparisonRange(
  range: DateRange,
  mode: ComparisonMode,
  custom?: DateRange | null
): DateRange {
  if (mode === "custom" && custom) return custom
  if (mode === "previous_year") return previousYear(range)
  return previousPeriod(range)
}

export function inferGranularity(range: DateRange): Granularity {
  const days = differenceInCalendarDays(range.end, range.start) + 1
  if (days <= 31) return "day"
  if (days <= 60) return "week"
  return "month"
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function comparisonModeLabel(mode: ComparisonMode): string {
  switch (mode) {
    case "previous_year":
      return "Sidste år"
    case "custom":
      return "Tilpasset"
    default:
      return "Forrige periode"
  }
}

export function periodLabel(range: DateRange): string {
  const startYear = range.start.getFullYear()
  const endYear = range.end.getFullYear()
  if (startYear === endYear) return String(startYear)
  return `${startYear}/${String(endYear).slice(2)}`
}

export function isFullCalendarYear(range: DateRange): boolean {
  return (
    range.start.getTime() === startOfYear(range.start).getTime() &&
    range.end.getTime() >= endOfYear(range.start).getTime()
  )
}

export { endOfDay, startOfDay }
