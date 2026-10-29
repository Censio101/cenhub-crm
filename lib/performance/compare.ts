import type { Locale } from "@/lib/i18n/types"

import { formatMonthLabel } from "./format"
import { getMetric } from "./metrics"
import { toIsoDate } from "./date-ranges"
import type {
  ChartPoint,
  DateRange,
  Granularity,
  MetricId,
  PerformanceBucket,
} from "./types"

export function alignByOffset<T>(
  current: T[],
  comparison: T[]
): { current: T | undefined; comparison: T | undefined }[] {
  const length = Math.max(current.length, comparison.length)
  return Array.from({ length }, (_, index) => ({
    current: current[index],
    comparison: comparison[index],
  }))
}

export function buildChartPoints(
  metricId: MetricId,
  currentBuckets: PerformanceBucket[],
  comparisonBuckets: PerformanceBucket[] | null,
  granularity: Granularity,
  locale: Locale = "da"
): ChartPoint[] {
  const metric = getMetric(metricId)
  const aligned = alignByOffset(currentBuckets, comparisonBuckets ?? [])
  const showYear = spansMultipleYears(currentBuckets)

  return aligned.map((pair, index) => {
    const current = pair.current
    const comparison = pair.comparison
    const label = current
      ? pointLabel(current, granularity, locale, showYear)
      : comparison
        ? pointLabel(comparison, granularity, locale, showYear)
        : String(index + 1)

    return {
      key: current?.start ?? comparison?.start ?? String(index),
      label,
      current: current ? metric.compute(current) : null,
      comparison: comparison ? metric.compute(comparison) : null,
    }
  })
}

function spansMultipleYears(buckets: PerformanceBucket[]): boolean {
  if (buckets.length < 2) return false
  return buckets[0].start.slice(0, 4) !== buckets[buckets.length - 1].start.slice(0, 4)
}

function pointLabel(
  bucket: PerformanceBucket,
  granularity: Granularity,
  locale: Locale,
  showYear = false
): string {
  const date = new Date(`${bucket.start}T00:00:00`)
  if (granularity === "month") {
    const month = formatMonthLabel(date, locale)
    return showYear ? `${month} ’${String(date.getFullYear()).slice(2)}` : month
  }
  // Weeks are labelled by the Monday they start on, so labels stay unique across months.
  return `${date.getDate()}. ${formatMonthLabel(date, locale).toLowerCase()}`
}

export function comparisonSeriesLabel(
  range: DateRange | null,
  emptyLabel = "Sammenligning"
): string {
  if (!range) return emptyLabel
  const startYear = range.start.getFullYear()
  const endYear = range.end.getFullYear()
  if (startYear === endYear) return String(startYear)
  return `${startYear}/${String(endYear).slice(2)}`
}

export function currentSeriesLabel(range: DateRange): string {
  return comparisonSeriesLabel(range)
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end
}

export function clipIso(range: DateRange): { start: string; end: string } {
  return {
    start: toIsoDate(range.start),
    end: toIsoDate(range.end),
  }
}
