import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfWeek,
} from "date-fns"

import type { Locale } from "@/lib/i18n/types"
import type { Lead } from "@/lib/leads"

import { chartYearsFromData } from "./chart-years"
import { buildChartPoints } from "./compare"
import {
  inferGranularity,
  periodLabel,
  resolveYearOverviewRange,
  toIsoDate,
} from "./date-ranges"
import { dailyAdSpend } from "./ad-spend-for-range"
import {
  buildDailyBucketsFromLeads,
  getLeadDataDateRange,
} from "./from-leads"
import { accumulateMonthly, emptyTotals, sumTotals } from "./metrics"
import { getDailyMockData, MONTHLY_MOCK_DATA } from "./mock-data"
import { b2bShare } from "./customer-segments"
import type { CustomerSegmentId } from "./customer-segments"
import type { FunnelId } from "./funnels"
import type { ServiceId } from "./services"
import type {
  DashboardQuery,
  DateRange,
  Granularity,
  MetricId,
  PerformanceBucket,
  PerformanceDashboardData,
  PeriodResult,
  YearOverview,
} from "./types"

function parseBucketDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function bucketOverlaps(bucket: PerformanceBucket, range: DateRange): boolean {
  const start = parseBucketDate(bucket.start)
  const end = parseBucketDate(bucket.end)
  return start <= range.end && end >= range.start
}

function aggregateDays(
  days: PerformanceBucket[],
  granularity: Granularity
): PerformanceBucket[] {
  const groups = new Map<string, PerformanceBucket[]>()

  for (const day of days) {
    const date = parseBucketDate(day.start)
    // Every granularity merges its buckets, including "day": the raw buckets are one per day *and*
    // service/funnel, so a day can hold several that must be added together.
    const key =
      granularity === "day"
        ? day.start
        : granularity === "week"
          ? toIsoDate(startOfWeek(date, { weekStartsOn: 1 }))
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    const group = groups.get(key)
    if (group) {
      group.push(day)
    } else {
      groups.set(key, [day])
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, groupDays]) => {
      const date = parseBucketDate(groupDays[0].start)
      const start =
        granularity === "day"
          ? date
          : granularity === "week"
            ? startOfWeek(date, { weekStartsOn: 1 })
            : new Date(date.getFullYear(), date.getMonth(), 1)
      const end =
        granularity === "day"
          ? date
          : granularity === "week"
            ? endOfWeek(date, { weekStartsOn: 1 })
            : new Date(date.getFullYear(), date.getMonth() + 1, 0)

      return {
        start: toIsoDate(start),
        end: toIsoDate(end),
        ...sumTotals(groupDays),
      }
    })
}

function emptyPeriodBucket(start: Date, end: Date): PerformanceBucket {
  return { ...emptyTotals(), start: toIsoDate(start), end: toIsoDate(end) }
}

/**
 * One bucket per day / week / month of `range` (up to `now`), so charts have no gaps on quiet
 * days. Buckets are matched by their start date; missing periods become zero buckets.
 */
export function fillBucketsForRange(
  buckets: PerformanceBucket[],
  range: DateRange,
  granularity: Granularity,
  now: Date = new Date()
): PerformanceBucket[] {
  const cap = endOfDay(now)
  const end = range.end > cap ? cap : range.end
  if (end < range.start) return []

  // Add up every bucket that starts on the same date instead of letting the last one win.
  const grouped = new Map<string, PerformanceBucket[]>()
  for (const bucket of buckets) {
    const group = grouped.get(bucket.start)
    if (group) group.push(bucket)
    else grouped.set(bucket.start, [bucket])
  }
  const byStart = new Map<string, PerformanceBucket>()
  for (const [start, group] of grouped) {
    byStart.set(
      start,
      group.length === 1 ? group[0] : { ...group[0], ...sumTotals(group) }
    )
  }
  const interval = { start: range.start, end }

  const slots: { start: Date; end: Date }[] =
    granularity === "day"
      ? eachDayOfInterval(interval).map((day) => ({ start: day, end: day }))
      : granularity === "week"
        ? eachWeekOfInterval(interval, { weekStartsOn: 1 }).map((weekStart) => ({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 1 }),
          }))
        : eachMonthOfInterval(interval).map((monthStart) => ({
            start: monthStart,
            end: endOfMonth(monthStart),
          }))

  return slots.map(
    (slot) => byStart.get(toIsoDate(slot.start)) ?? emptyPeriodBucket(slot.start, slot.end)
  )
}

/** Jan to Dec of `year`; months that have not started yet are flagged `isFuture`. */
export function getYearOverview(
  year: number,
  filters: {
    service?: ServiceId | null
    funnel?: FunnelId | null
    segment?: CustomerSegmentId | null
  },
  input: PerformanceInput,
  now: Date = new Date()
): YearOverview {
  const range: DateRange = {
    start: new Date(year, 0, 1),
    end: endOfDay(new Date(year, 11, 31)),
  }
  const period = buildPeriod(
    range,
    "month",
    filters.service,
    filters.funnel,
    filters.segment,
    { ...input, now }
  )
  const byStart = new Map(period.monthlyBuckets.map((bucket) => [bucket.start, bucket]))

  const monthlyBuckets = Array.from({ length: 12 }, (_, month) => {
    const start = new Date(year, month, 1)
    const existing = byStart.get(toIsoDate(start))
    const bucket = existing ?? emptyPeriodBucket(start, endOfMonth(start))
    return start > now ? { ...bucket, isFuture: true } : bucket
  })

  return {
    year,
    monthlyBuckets,
    cumulativeBuckets: accumulateMonthly(monthlyBuckets),
  }
}

/** Share of a bucket that belongs to the chosen customer segment (customer split, else an estimate). */
function segmentShare(bucket: PerformanceBucket, segment: CustomerSegmentId): number {
  const b2b = bucket.b2bCustomers ?? 0
  const b2c = bucket.b2cCustomers ?? 0
  const selected = segment === "b2b" ? b2b : b2c
  const total = bucket.customers || b2b + b2c
  const month = new Date(`${bucket.start}T00:00:00`).getMonth()
  const fallback = bucket.service ? b2bShare(bucket.service, month) : 0.5
  return total === 0 ? (segment === "b2b" ? fallback : 1 - fallback) : selected / total
}

function applyCustomerSegment(
  bucket: PerformanceBucket,
  segment?: CustomerSegmentId | null
): PerformanceBucket {
  if (!segment) return bucket

  const b2b = bucket.b2bCustomers ?? 0
  const b2c = bucket.b2cCustomers ?? 0
  const selected = segment === "b2b" ? b2b : b2c
  const share = segmentShare(bucket, segment)

  return {
    ...bucket,
    leads: Math.round(bucket.leads * share),
    customers: selected,
    b2bCustomers: segment === "b2b" ? selected : 0,
    b2cCustomers: segment === "b2c" ? selected : 0,
    revenue: bucket.revenue * share,
    adSpend: bucket.adSpend * share,
    profit: bucket.profit == null ? null : bucket.profit * share,
    ltv: bucket.ltv == null ? null : bucket.ltv * share,
    qualified:
      bucket.qualified == null
        ? undefined
        : Math.round(bucket.qualified * share),
    quotes:
      bucket.quotes == null ? undefined : Math.round(bucket.quotes * share),
  }
}

export type PerformanceInput = {
  leads?: readonly Lead[]
  adSpendByMonth?: Record<string, number>
  /** "Today" for ad spend (month-to-date) and for capping future days; defaults to now. */
  now?: Date
}

/**
 * Share of each month's ad spend that belongs to the filtered view: the filtered leads (times the
 * segment share) divided by all leads of that month. Months without any leads have nothing to
 * attribute spend to, so a filtered view gets none of it.
 */
function spendShareByMonth(
  leadBuckets: readonly PerformanceBucket[],
  service?: ServiceId | null,
  funnel?: FunnelId | null,
  segment?: CustomerSegmentId | null
): Map<string, number> {
  const totalLeads = new Map<string, number>()
  const matchingLeads = new Map<string, number>()

  for (const bucket of leadBuckets) {
    if (bucket.leads <= 0) continue
    const key = bucket.start.slice(0, 7)
    totalLeads.set(key, (totalLeads.get(key) ?? 0) + bucket.leads)
    if ((service && bucket.service !== service) || (funnel && bucket.funnel !== funnel)) continue
    const share = segment ? segmentShare(bucket, segment) : 1
    matchingLeads.set(key, (matchingLeads.get(key) ?? 0) + bucket.leads * share)
  }

  const shares = new Map<string, number>()
  for (const [key, total] of totalLeads) {
    shares.set(key, total > 0 ? (matchingLeads.get(key) ?? 0) / total : 0)
  }
  return shares
}

/**
 * Ad spend as one bucket per day of the range, independent of leads (a day without leads still
 * has spend). Unfiltered, the sum is exactly the ad budget for the range; with a service, funnel
 * or segment filter each month's spend is scaled by that filter's share of the month.
 */
function buildSpendBuckets(
  range: DateRange,
  leadBuckets: readonly PerformanceBucket[],
  service: ServiceId | null | undefined,
  funnel: FunnelId | null | undefined,
  segment: CustomerSegmentId | null | undefined,
  input: PerformanceInput
): PerformanceBucket[] {
  const daily = dailyAdSpend(range, input.adSpendByMonth ?? {}, input.now)
  if (daily.size === 0) return []

  const filtered = Boolean(service || funnel || segment)
  const shares = filtered ? spendShareByMonth(leadBuckets, service, funnel, segment) : null

  const buckets: PerformanceBucket[] = []
  for (const [isoDate, amount] of daily) {
    const share = shares ? (shares.get(isoDate.slice(0, 7)) ?? 0) : 1
    const adSpend = amount * share
    if (adSpend <= 0) continue
    buckets.push({
      start: isoDate,
      end: isoDate,
      leads: 0,
      customers: 0,
      b2bCustomers: 0,
      b2cCustomers: 0,
      revenue: 0,
      adSpend,
      profit: 0,
      ltv: 0,
      qualified: 0,
      quotes: 0,
    })
  }
  return buckets
}

function collectDays(
  range: DateRange,
  service?: ServiceId | null,
  funnel?: FunnelId | null,
  segment?: CustomerSegmentId | null,
  input?: PerformanceInput
): PerformanceBucket[] {
  // Without input the demo data (with its own embedded spend) is used.
  const raw = input !== undefined ? buildDailyBucketsFromLeads(input.leads ?? []) : getDailyMockData()
  const leadDays = raw
    .filter(
      (bucket) =>
        bucketOverlaps(bucket, range) &&
        (!service || bucket.service === service) &&
        (!funnel || bucket.funnel === funnel)
    )
    .map((bucket) => applyCustomerSegment(bucket, segment))

  if (input === undefined) return leadDays
  return [...leadDays, ...buildSpendBuckets(range, raw, service, funnel, segment, input)]
}

function buildPeriod(
  range: DateRange,
  granularity: Granularity,
  service?: ServiceId | null,
  funnel?: FunnelId | null,
  segment?: CustomerSegmentId | null,
  input?: PerformanceInput
): PeriodResult {
  const days = collectDays(range, service, funnel, segment, input)
  const buckets = aggregateDays(days, granularity)
  const monthlyBuckets = aggregateDays(days, "month")
  const totals = buckets.length > 0 ? sumTotals(buckets) : emptyTotals()

  return {
    buckets,
    monthlyBuckets,
    totals,
    label: periodLabel(range),
  }
}

function hasActivity(period: PeriodResult): boolean {
  return (
    period.totals.leads > 0 ||
    period.totals.customers > 0 ||
    period.totals.revenue > 0 ||
    period.totals.adSpend > 0
  )
}

function isPartial(range: DateRange, input?: PerformanceInput): boolean {
  if (input?.leads) {
    const leadRange = getLeadDataDateRange(input.leads)
    if (!leadRange) return false
    const firstData = parseBucketDate(leadRange.start)
    const lastData = parseBucketDate(leadRange.end)
    return range.start < firstData || range.end > lastData
  }

  const firstData = parseBucketDate(MONTHLY_MOCK_DATA[0].start)
  const lastData = parseBucketDate(
    MONTHLY_MOCK_DATA[MONTHLY_MOCK_DATA.length - 1].end
  )
  return range.start < firstData || range.end > lastData
}

export type GetPerformanceDashboardOptions = {
  /** Calendar month cap for year table/chart (defaults to real today). */
  now?: Date
  /** Which calendar year the chart + monthly table show (defaults to end of filter range). */
  chartYear?: number
}

export function getPerformanceDashboard(
  query: DashboardQuery,
  rawInput?: PerformanceInput,
  options?: GetPerformanceDashboardOptions
): PerformanceDashboardData {
  const now = options?.now ?? rawInput?.now ?? new Date()
  // One "today" for everything below, so ad spend and the chart always agree.
  const input = rawInput ? { ...rawInput, now } : undefined
  const granularity = inferGranularity(query.range)
  const current = buildPeriod(
    query.range,
    granularity,
    query.service,
    query.funnel,
    query.segment,
    input
  )
  const comparisonPeriod = query.comparison
    ? buildPeriod(
        query.comparison,
        granularity,
        query.service,
        query.funnel,
        query.segment,
        input
      )
    : null
  const comparison =
    comparisonPeriod && hasActivity(comparisonPeriod) ? comparisonPeriod : null

  const defaultYear = query.range.end.getFullYear()
  const year = options?.chartYear ?? defaultYear
  const yearOverviewRange = resolveYearOverviewRange(year, now)
  const chartYears = input
    ? chartYearsFromData(input.leads ?? [], input.adSpendByMonth ?? {})
    : []
  const yearPeriod = buildPeriod(
    yearOverviewRange,
    "month",
    query.service,
    query.funnel,
    query.segment,
    input
  )

  let status: PerformanceDashboardData["status"] = "ok"
  if (!hasActivity(current)) {
    status = "empty"
  } else if (isPartial(query.range, input)) {
    status = "partial"
  }

  return {
    current,
    comparison,
    year: {
      year,
      monthlyBuckets: yearPeriod.monthlyBuckets,
      cumulativeBuckets: accumulateMonthly(yearPeriod.monthlyBuckets),
    },
    chartYears: chartYears.length > 0 ? chartYears : [year],
    chart: {
      current: fillBucketsForRange(current.buckets, query.range, granularity, now),
      comparison:
        comparison && query.comparison
          ? fillBucketsForRange(comparison.buckets, query.comparison, granularity, now)
          : null,
    },
    status,
    granularity,
  }
}

export function getChartSeries(
  data: PerformanceDashboardData,
  metricId: MetricId,
  locale: Locale = "da"
) {
  const buckets = data.chart.current
  const comparisonBuckets = data.chart.comparison
  const granularity = data.granularity
  const points = buildChartPoints(
    metricId,
    buckets,
    comparisonBuckets,
    granularity,
    locale
  )

  if (metricId !== "revenue") return points

  const spendPoints = buildChartPoints(
    "adSpend",
    buckets,
    null,
    granularity,
    locale
  )

  return points.map((point, index) => ({
    ...point,
    spend: spendPoints[index]?.current ?? null,
  }))
}
