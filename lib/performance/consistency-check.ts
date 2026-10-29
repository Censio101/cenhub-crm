import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns"

import type { Lead } from "@/lib/leads"
import { getLeadServiceIds } from "@/lib/leads"

import { FUNNELS, isFunnelId } from "./funnels"
import { previousPeriod, resolvePreset, toIsoDate } from "./date-ranges"
import { getPerformanceDashboard, getYearOverview } from "./get-performance"
import { getMetric } from "./metrics"
import type { DatePreset, DateRange, PerformanceBucket, PeriodTotals } from "./types"

/**
 * Independent re-computation of every dashboard number straight from the raw leads and the
 * monthly ad spend, compared with what the dashboard engine produces. Used by the audit script
 * (real clients) and by the tests (synthetic data). It deliberately does NOT reuse the engine's
 * allocation code, so a bug there cannot hide itself.
 */

export type ConsistencyInput = {
  leads: readonly Lead[]
  adSpendByMonth: Record<string, number>
}

export type ConsistencyIssue = {
  scope: string
  check: string
  expected: number
  actual: number
}

const EPSILON = 0.01

function near(a: number, b: number, tolerance = EPSILON): boolean {
  return Math.abs(a - b) <= tolerance
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Ad spend for every day in `range`, straight from the monthly numbers. */
export function expectedAdSpend(
  adSpendByMonth: Record<string, number>,
  range: DateRange,
  now: Date
): number {
  const today = startOfDay(now)
  let total = 0
  for (
    let day = startOfDay(range.start);
    day <= range.end && day <= today;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    const spend = adSpendByMonth[monthKey(day)]
    if (!spend || spend <= 0) continue
    const isCurrentMonth =
      day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth()
    // A completed month's row covers the whole month; the current month's row is month-to-date.
    const daysCovered = isCurrentMonth ? today.getDate() : daysInMonth(day.getFullYear(), day.getMonth())
    total += spend / daysCovered
  }
  return total
}

type Recount = {
  leads: number
  customers: number
  revenue: number
  profit: number
  ltv: number
}

function wonDateOf(lead: Lead): string {
  return lead.wonDate ?? lead.date
}

function finite(value: number | null | undefined): number {
  return value != null && Number.isFinite(value) ? value : 0
}

/** Counts straight from the raw leads: leads by intake date, won values by won date. */
export function recountFromLeads(leads: readonly Lead[], range: DateRange): Recount {
  const start = toIsoDate(range.start)
  const end = toIsoDate(range.end)
  const out: Recount = { leads: 0, customers: 0, revenue: 0, profit: 0, ltv: 0 }
  for (const lead of leads) {
    if (lead.date >= start && lead.date <= end) out.leads += 1
    if (lead.status === "won") {
      const won = wonDateOf(lead)
      if (won >= start && won <= end) {
        out.customers += 1
        out.revenue += finite(lead.salesPrice)
        out.profit += finite(lead.profit)
        out.ltv += finite(lead.ltv)
      }
    }
  }
  return out
}

const SUM_FIELDS = ["leads", "customers", "revenue", "adSpend"] as const

function sumBuckets(buckets: readonly PerformanceBucket[]) {
  const out = { leads: 0, customers: 0, revenue: 0, adSpend: 0, profit: 0, ltv: 0 }
  for (const bucket of buckets) {
    out.leads += bucket.leads
    out.customers += bucket.customers
    out.revenue += bucket.revenue
    out.adSpend += bucket.adSpend
    out.profit += getMetric("profit").compute(bucket) ?? 0
    out.ltv += bucket.ltv ?? 0
  }
  return out
}

function metricValues(totals: PeriodTotals) {
  return {
    leads: totals.leads,
    customers: totals.customers,
    revenue: totals.revenue,
    adSpend: totals.adSpend,
    profit: getMetric("profit").compute(totals) ?? 0,
    ltv: getMetric("ltv").compute(totals) ?? 0,
  }
}

function pushIfDifferent(
  issues: ConsistencyIssue[],
  scope: string,
  check: string,
  expected: number,
  actual: number,
  tolerance = EPSILON
) {
  if (!near(expected, actual, tolerance)) issues.push({ scope, check, expected, actual })
}

/** Ranges every client is checked on: all presets plus ranges that cut through months. */
export function auditRanges(now: Date): { label: string; range: DateRange }[] {
  const presets: DatePreset[] = [
    "this_month",
    "last_month",
    "last_30_days",
    "last_3_months",
    "last_6_months",
    "ytd",
    "last_12_months",
  ]
  const ranges: { label: string; range: DateRange }[] = presets.map((preset) => ({
    label: preset,
    range: resolvePreset(preset, now),
  }))
  ranges.push({
    label: "last_45_days (weekly)",
    range: { start: startOfDay(subDays(now, 44)), end: endOfDay(now) },
  })
  ranges.push({
    label: "cuts_through_months",
    range: {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 10)),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 20)),
    },
  })
  ranges.push({
    label: "single_week",
    range: { start: startOfDay(subDays(now, 6)), end: endOfDay(now) },
  })
  return ranges
}

function checkRange(
  issues: ConsistencyIssue[],
  scope: string,
  range: DateRange,
  input: ConsistencyInput,
  now: Date,
  withComparison: boolean
) {
  const comparisonRange = withComparison ? previousPeriod(range) : null
  const data = getPerformanceDashboard(
    { range, comparison: comparisonRange },
    { ...input, now },
    { now }
  )

  const checkPeriod = (
    label: string,
    periodRange: DateRange,
    totals: PeriodTotals,
    chartBuckets: readonly PerformanceBucket[]
  ) => {
    const kpi = metricValues(totals)
    const recount = recountFromLeads(input.leads, periodRange)
    const spend = expectedAdSpend(input.adSpendByMonth, periodRange, now)

    pushIfDifferent(issues, `${scope} ${label}`, "KPI leads vs raw leads", recount.leads, kpi.leads)
    pushIfDifferent(issues, `${scope} ${label}`, "KPI customers vs raw leads", recount.customers, kpi.customers)
    pushIfDifferent(issues, `${scope} ${label}`, "KPI revenue vs raw leads", recount.revenue, kpi.revenue)
    pushIfDifferent(issues, `${scope} ${label}`, "KPI profit vs raw leads", recount.profit, kpi.profit)
    pushIfDifferent(issues, `${scope} ${label}`, "KPI LTV vs raw leads", recount.ltv, kpi.ltv)
    pushIfDifferent(issues, `${scope} ${label}`, "KPI ad spend vs monthly spend", spend, kpi.adSpend, 0.05)

    const chart = sumBuckets(chartBuckets)
    for (const field of SUM_FIELDS) {
      pushIfDifferent(issues, `${scope} ${label}`, `chart ${field} vs KPI`, kpi[field], chart[field], 0.05)
    }
    pushIfDifferent(issues, `${scope} ${label}`, "chart profit vs KPI", kpi.profit, chart.profit, 0.05)
    pushIfDifferent(issues, `${scope} ${label}`, "chart LTV vs KPI", kpi.ltv, chart.ltv, 0.05)
  }

  checkPeriod("current", range, data.current.totals, data.chart.current)
  if (comparisonRange && data.comparison) {
    checkPeriod("comparison", comparisonRange, data.comparison.totals, data.chart.comparison ?? [])
  }
}

function checkServiceSplit(
  issues: ConsistencyIssue[],
  scope: string,
  range: DateRange,
  input: ConsistencyInput,
  now: Date
) {
  const all = metricValues(
    getPerformanceDashboard({ range }, { ...input, now }, { now }).current.totals
  )
  const serviceIds = new Set<string>()
  for (const lead of input.leads) {
    for (const id of getLeadServiceIds(lead)) serviceIds.add(id)
  }
  const sums = { leads: 0, customers: 0, revenue: 0, adSpend: 0 }
  for (const service of serviceIds) {
    const part = metricValues(
      getPerformanceDashboard({ range, service }, { ...input, now }, { now }).current.totals
    )
    sums.leads += part.leads
    sums.customers += part.customers
    sums.revenue += part.revenue
    sums.adSpend += part.adSpend
  }
  const unassigned = recountFromLeads(
    input.leads.filter((lead) => getLeadServiceIds(lead).length === 0),
    range
  )
  pushIfDifferent(issues, scope, "services + unassigned leads vs total", all.leads, sums.leads + unassigned.leads, 0.05)
  pushIfDifferent(issues, scope, "services + unassigned customers vs total", all.customers, sums.customers + unassigned.customers, 0.05)
  pushIfDifferent(issues, scope, "services + unassigned revenue vs total", all.revenue, sums.revenue + unassigned.revenue, 0.05)
  if (sums.adSpend > all.adSpend + 0.05) {
    issues.push({ scope, check: "services ad spend exceeds total", expected: all.adSpend, actual: sums.adSpend })
  }

  const funnelSums = { leads: 0, revenue: 0 }
  for (const funnel of FUNNELS) {
    const part = metricValues(
      getPerformanceDashboard({ range, funnel: funnel.id }, { ...input, now }, { now }).current.totals
    )
    funnelSums.leads += part.leads
    funnelSums.revenue += part.revenue
  }
  const noFunnel = recountFromLeads(
    input.leads.filter((lead) => !(lead.platform && isFunnelId(lead.platform))),
    range
  )
  pushIfDifferent(issues, scope, "funnels + no-funnel leads vs total", all.leads, funnelSums.leads + noFunnel.leads, 0.05)
  pushIfDifferent(issues, scope, "funnels + no-funnel revenue vs total", all.revenue, funnelSums.revenue + noFunnel.revenue, 0.05)
}

function checkYearTable(
  issues: ConsistencyIssue[],
  scope: string,
  year: number,
  input: ConsistencyInput,
  now: Date
) {
  const overview = getYearOverview(year, {}, { ...input, now }, now)
  const fullYear: DateRange = {
    start: new Date(year, 0, 1),
    end: endOfDay(new Date(year, 11, 31)),
  }
  const kpi = metricValues(
    getPerformanceDashboard({ range: fullYear }, { ...input, now }, { now }).current.totals
  )
  const table = sumBuckets(overview.monthlyBuckets)
  for (const field of SUM_FIELDS) {
    pushIfDifferent(issues, scope, `year table ${field} vs full-year KPI`, kpi[field], table[field], 0.05)
  }
  const last = overview.cumulativeBuckets.at(-1)
  if (last) {
    pushIfDifferent(issues, scope, "cumulative December revenue vs table total", table.revenue, last.revenue, 0.05)
    pushIfDifferent(issues, scope, "cumulative December ad spend vs table total", table.adSpend, last.adSpend, 0.05)
    pushIfDifferent(issues, scope, "cumulative December leads vs table total", table.leads, last.leads, 0.05)
  }
  pushIfDifferent(
    issues,
    scope,
    "year table ad spend vs monthly spend",
    expectedAdSpend(input.adSpendByMonth, fullYear, now),
    table.adSpend,
    0.05
  )
}

/** Runs every consistency check; an empty list means all dashboard numbers agree. */
export function runConsistencyAudit(
  input: ConsistencyInput,
  now: Date = new Date()
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  for (const { label, range } of auditRanges(now)) {
    checkRange(issues, label, range, input, now, false)
    checkRange(issues, `${label} +compare`, range, input, now, true)
  }
  checkServiceSplit(issues, "ytd service/funnel split", resolvePreset("ytd", now), input, now)
  checkServiceSplit(
    issues,
    "this_month service/funnel split",
    { start: startOfMonth(now), end: endOfDay(now) },
    input,
    now
  )
  checkYearTable(issues, "year table", now.getFullYear(), input, now)
  return issues
}
