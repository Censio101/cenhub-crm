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
  granularity: Granularity
): ChartPoint[] {
  const metric = getMetric(metricId)
  const aligned = alignByOffset(currentBuckets, comparisonBuckets ?? [])

  return aligned.map((pair, index) => {
    const current = pair.current
    const comparison = pair.comparison
    const label = current
      ? pointLabel(current, granularity)
      : comparison
        ? pointLabel(comparison, granularity)
        : String(index + 1)

    return {
      key: current?.start ?? comparison?.start ?? String(index),
      label,
      current: current ? metric.compute(current) : null,
      comparison: comparison ? metric.compute(comparison) : null,
    }
  })
}

function pointLabel(bucket: PerformanceBucket, granularity: Granularity): string {
  const date = new Date(`${bucket.start}T00:00:00`)
  if (granularity === "month") return formatMonthLabel(date)
  if (granularity === "week") return `Uge ${Math.ceil(date.getDate() / 7)}`
  return `${date.getDate()}. ${formatMonthLabel(date).toLowerCase()}`
}

export function comparisonSeriesLabel(range: DateRange | null): string {
  if (!range) return "Sammenligning"
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
