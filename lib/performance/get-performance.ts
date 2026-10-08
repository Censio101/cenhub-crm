import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns"

import type { Locale } from "@/lib/i18n/types"
import type { Lead } from "@/lib/leads"

import { buildChartPoints } from "./compare"
import {
  inferGranularity,
  periodLabel,
  resolveYearOverviewRange,
  toIsoDate,
} from "./date-ranges"
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
  if (granularity === "day") return days

  const groups = new Map<string, PerformanceBucket[]>()

  for (const day of days) {
    const date = parseBucketDate(day.start)
    const key =
      granularity === "week"
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
        granularity === "week"
          ? startOfWeek(date, { weekStartsOn: 1 })
          : new Date(date.getFullYear(), date.getMonth(), 1)
      const end =
        granularity === "week"
          ? endOfWeek(date, { weekStartsOn: 1 })
          : new Date(date.getFullYear(), date.getMonth() + 1, 0)

      return {
        start: toIsoDate(start),
        end: toIsoDate(end),
        ...sumTotals(groupDays),
      }
    })
}

function applyCustomerSegment(
  bucket: PerformanceBucket,
  segment?: CustomerSegmentId | null
): PerformanceBucket {
  if (!segment) return bucket

  const b2b = bucket.b2bCustomers ?? 0
  const b2c = bucket.b2cCustomers ?? 0
  const selected = segment === "b2b" ? b2b : b2c
  const total = bucket.customers || b2b + b2c
  const month = new Date(`${bucket.start}T00:00:00`).getMonth()
  const fallback = bucket.service ? b2bShare(bucket.service, month) : 0.5
  const share =
    total === 0
      ? segment === "b2b"
        ? fallback
        : 1 - fallback
      : selected / total

  return {
    ...bucket,
    leads: Math.round(bucket.leads * share),
    customers: selected,
    b2bCustomers: segment === "b2b" ? selected : 0,
    b2cCustomers: segment === "b2c" ? selected : 0,
    revenue: bucket.revenue * share,
    adSpend: bucket.adSpend * share,
    profit: bucket.profit == null ? null : bucket.profit * share,
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
}

function leadsInRange(leads: readonly Lead[], range: DateRange): Lead[] {
  const start = toIsoDate(startOfDay(range.start))
  const end = toIsoDate(startOfDay(range.end))
  return leads.filter((lead) => lead.date >= start && lead.date <= end)
}

function resolveDailyBuckets(
  range: DateRange,
  input?: PerformanceInput
): PerformanceBucket[] {
  if (input !== undefined) {
    const adSpendByMonth = input.adSpendByMonth ?? {}
    return buildDailyBucketsFromLeads(leadsInRange(input.leads ?? [], range), adSpendByMonth, {
      range,
    })
  }
  return getDailyMockData()
}

function collectDays(
  range: DateRange,
  service?: ServiceId | null,
  funnel?: FunnelId | null,
  segment?: CustomerSegmentId | null,
  input?: PerformanceInput
): PerformanceBucket[] {
  const raw = resolveDailyBuckets(range, input)
  const filtered = raw
    .filter(
      (bucket) =>
        bucketOverlaps(bucket, range) &&
        (!service || bucket.service === service) &&
        (!funnel || bucket.funnel === funnel)
    )
    .map((bucket) => applyCustomerSegment(bucket, segment))
  if (typeof fetch !== "undefined") {
    // #region agent log
    fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "138f58",
      },
      body: JSON.stringify({
        sessionId: "138f58",
        hypothesisId: "C-D",
        location: "get-performance.ts:collectDays",
        message: "buckets collected",
        data: {
          from: toIsoDate(range.start),
          to: toIsoDate(range.end),
          service,
          funnel,
          rawCount: raw.length,
          filteredCount: filtered.length,
          rawAdSpend: raw.reduce((s, b) => s + b.adSpend, 0),
          filteredAdSpend: filtered.reduce((s, b) => s + b.adSpend, 0),
          leadsInRange: input?.leads ? leadsInRange(input.leads, range).length : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }
  return filtered
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
}

export function getPerformanceDashboard(
  query: DashboardQuery,
  input?: PerformanceInput,
  options?: GetPerformanceDashboardOptions
): PerformanceDashboardData {
  const now = options?.now ?? new Date()
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

  const year = query.range.end.getFullYear()
  const yearOverviewRange = resolveYearOverviewRange(year, now)
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
    status,
    granularity,
  }
}

export function getChartSeries(
  data: PerformanceDashboardData,
  metricId: MetricId,
  locale: Locale = "da"
) {
  const points = buildChartPoints(
    metricId,
    data.year.monthlyBuckets,
    null,
    "month",
    locale
  )

  if (metricId !== "revenue") return points

  const spendPoints = buildChartPoints(
    "adSpend",
    data.year.monthlyBuckets,
    null,
    "month",
    locale
  )

  return points.map((point, index) => ({
    ...point,
    spend: spendPoints[index]?.current ?? null,
  }))
}
