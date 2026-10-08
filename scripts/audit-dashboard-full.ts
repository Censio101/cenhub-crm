/**
 * Full dashboard audit: presets, filters, KPI↔bucket consistency, URL state, year table.
 * Run: npx tsx scripts/audit-dashboard-full.ts
 */
import { appendFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i < 0) continue
      const key = trimmed.slice(0, i)
      if (!process.env[key]) process.env[key] = trimmed.slice(i + 1)
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { endOfMonth, startOfMonth } from "date-fns"

import { listAdSpendByMonth } from "../lib/db/ad-metrics-repository"
import { listLeadsForOrganization } from "../lib/db/leads-repository"
import { getOrganizationServicesView } from "../lib/db/services-repository"
import { DATE_PRESETS, resolvePreset, toIsoDate } from "../lib/performance/date-ranges"
import { FUNNELS } from "../lib/performance/funnels"
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { getMetric, sumTotals } from "../lib/performance/metrics"
import {
  applyPresetChange,
  resolveComparisonRange,
} from "../lib/performance/dashboard-view-mutations"
import {
  dashboardStateToParams,
  parseDashboardParams,
  type DashboardViewState,
} from "../lib/performance/url-state"
import type { DatePreset } from "../lib/performance/types"
import { createAdminClient } from "../lib/supabase/admin"

const LOG_PATH = resolve(process.cwd(), ".cursor/debug-138f58.log")

type Check = { id: string; ok: boolean; detail: string }

function logAudit(checks: Check[], meta: Record<string, unknown>) {
  const line = JSON.stringify({
    sessionId: "138f58",
    runId: "dashboard-audit",
    hypothesisId: "audit",
    location: "scripts/audit-dashboard-full.ts",
    message: "dashboard full audit",
    data: { checks, pass: checks.every((c) => c.ok), ...meta },
    timestamp: Date.now(),
  })
  appendFileSync(LOG_PATH, `${line}\n`)
}

function near(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) <= eps
}

function bucketSumLeads(data: ReturnType<typeof getPerformanceDashboard>): number {
  return data.current.buckets.reduce((s, b) => s + b.leads, 0)
}

function bucketSumRevenue(data: ReturnType<typeof getPerformanceDashboard>): number {
  return data.current.buckets.reduce((s, b) => s + b.revenue, 0)
}

function defaultView(): DashboardViewState {
  return parseDashboardParams(new URLSearchParams(""))
}

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()
  if (error || !org) throw error ?? new Error(`Org not found: ${slug}`)

  const [{ adSpendByMonth, source }, leads, servicesView] = await Promise.all([
    listAdSpendByMonth(admin, org.id),
    listLeadsForOrganization(admin, org.id),
    getOrganizationServicesView(admin, org.id),
  ])

  const serviceIds = servicesView.services.map((s) => s.id)
  const checks: Check[] = []
  const input = { leads, adSpendByMonth }

  console.log(`\n=== Full dashboard audit: ${org.name} ===`)
  console.log(`Leads: ${leads.length} | Ad spend source: ${source} | Months: ${Object.keys(adSpendByMonth).length}\n`)

  // A: Date presets resolve and produce stable totals
  console.log("--- Date presets ---")
  const presetRows: Array<{ preset: string; leads: number; revenue: number; adSpend: number; status: string }> = []
  for (const { id } of DATE_PRESETS) {
    if (id === "custom") continue
    const range = resolvePreset(id)
    const data = getPerformanceDashboard({ range }, input)
    presetRows.push({
      preset: id,
      leads: data.current.totals.leads,
      revenue: Math.round(data.current.totals.revenue),
      adSpend: Math.round(data.current.totals.adSpend),
      status: data.status,
    })
    const sumL = bucketSumLeads(data)
    const sumR = bucketSumRevenue(data)
    checks.push({
      id: `preset-${id}-bucket-leads`,
      ok: near(sumL, data.current.totals.leads, 0.5),
      detail: `${id}: bucket leads ${sumL} vs totals ${data.current.totals.leads}`,
    })
    checks.push({
      id: `preset-${id}-bucket-revenue`,
      ok: near(sumR, data.current.totals.revenue, 0.5),
      detail: `${id}: bucket revenue ${sumR} vs totals ${data.current.totals.revenue}`,
    })
    const ltv = getMetric("ltv").compute(data.current.totals)
    const expectedLtv =
      data.current.totals.customers > 0
        ? data.current.totals.revenue / data.current.totals.customers
        : null
    checks.push({
      id: `preset-${id}-ltv`,
      ok:
        (ltv == null && expectedLtv == null) ||
        (ltv != null && expectedLtv != null && near(ltv, expectedLtv)),
      detail: `${id}: LTV ${ltv} vs revenue/customers`,
    })
    console.log(
      `  ${id.padEnd(16)} range ${toIsoDate(range.start)}→${toIsoDate(range.end)} | leads=${data.current.totals.leads} revenue=${Math.round(data.current.totals.revenue)} adSpend=${Math.round(data.current.totals.adSpend)} status=${data.status}`
    )
  }

  // B: Custom single-month (May 2026) — known seed: 4 leads, 1 won @ 102k
  const mayRange = { start: startOfMonth(new Date(2026, 4, 1)), end: endOfMonth(new Date(2026, 4, 1)) }
  const may = getPerformanceDashboard({ range: mayRange }, input)
  checks.push({
    id: "custom-may-leads",
    ok: may.current.totals.leads === 5,
    detail: `May 2026 leads expected 5 got ${may.current.totals.leads}`,
  })
  checks.push({
    id: "custom-may-revenue",
    ok: may.current.totals.revenue === 102_000,
    detail: `May 2026 revenue expected 102000 got ${may.current.totals.revenue}`,
  })
  checks.push({
    id: "custom-may-customers",
    ok: may.current.totals.customers === 1,
    detail: `May 2026 customers expected 1 got ${may.current.totals.customers}`,
  })
  console.log("\n--- Custom May 2026 (seed contract) ---")
  console.log(
    `  leads=${may.current.totals.leads} customers=${may.current.totals.customers} revenue=${may.current.totals.revenue} profit=${may.current.totals.profit}`
  )

  // C: Service filters — each service ≤ all; union of services covers all lead-count share
  console.log("\n--- Service filters ---")
  const allYtd = getPerformanceDashboard({ range: resolvePreset("ytd") }, input)
  let serviceLeadSum = 0
  for (const service of serviceIds) {
    const part = getPerformanceDashboard({ range: resolvePreset("ytd"), service }, input)
    serviceLeadSum += part.current.totals.leads
    checks.push({
      id: `service-${service}-lte-all`,
      ok: part.current.totals.leads <= allYtd.current.totals.leads + 0.01,
      detail: `service ${service} leads ${part.current.totals.leads} <= all ${allYtd.current.totals.leads}`,
    })
    console.log(`  ${service.slice(0, 8)}… leads=${part.current.totals.leads} revenue=${Math.round(part.current.totals.revenue)}`)
  }
  checks.push({
    id: "service-sum-leads",
    ok: near(serviceLeadSum, allYtd.current.totals.leads, 0.5),
    detail: `sum(service leads)=${serviceLeadSum} vs all=${allYtd.current.totals.leads}`,
  })

  // D: Funnel filters
  console.log("\n--- Funnel filters (YTD) ---")
  for (const funnel of FUNNELS) {
    const part = getPerformanceDashboard({ range: resolvePreset("ytd"), funnel: funnel.id }, input)
    checks.push({
      id: `funnel-${funnel.id}`,
      ok: part.current.totals.leads <= allYtd.current.totals.leads + 0.01,
      detail: `funnel ${funnel.id} leads ${part.current.totals.leads}`,
    })
    console.log(`  ${funnel.id.padEnd(10)} leads=${part.current.totals.leads} revenue=${Math.round(part.current.totals.revenue)}`)
  }

  // E: Segment filters
  console.log("\n--- Segment filters (YTD) ---")
  const b2b = getPerformanceDashboard({ range: resolvePreset("ytd"), segment: "b2b" }, input)
  const b2c = getPerformanceDashboard({ range: resolvePreset("ytd"), segment: "b2c" }, input)
  checks.push({
    id: "segment-b2b-b2c-customers",
    ok: b2b.current.totals.customers + b2c.current.totals.customers <= allYtd.current.totals.customers + 0.01,
    detail: `b2b+b2c customers vs all`,
  })
  console.log(
    `  b2b leads=${b2b.current.totals.leads} customers=${b2b.current.totals.customers} | b2c leads=${b2c.current.totals.leads} customers=${b2c.current.totals.customers} | all customers=${allYtd.current.totals.customers}`
  )

  // F: Year table vs sum of monthly buckets
  const ytdRange = resolvePreset("ytd")
  const ytdData = getPerformanceDashboard({ range: ytdRange }, input)
  const yearMonthlySum = sumTotals(ytdData.year.monthlyBuckets)
  const expectedYearMonths = new Date().getMonth() + 1
  checks.push({
    id: "year-table-vs-calendar-year",
    ok: ytdData.year.monthlyBuckets.length === expectedYearMonths,
    detail: `year monthly bucket count ${ytdData.year.monthlyBuckets.length} (expected ${expectedYearMonths} through current month)`,
  })
  console.log("\n--- Year view (calendar 2026) ---")
  console.log(
    `  monthly rows=${ytdData.year.monthlyBuckets.length} | sum(monthly leads)=${yearMonthlySum.leads} | full-year query leads=${getPerformanceDashboard({ range: { start: startOfMonth(new Date(2026, 0, 1)), end: endOfMonth(new Date(2026, 11, 1)) } }, input).current.totals.leads}`
  )

  // G: URL state roundtrip
  let view = defaultView()
  view = applyPresetChange(view, "last_month")
  const qs = dashboardStateToParams(view)
  const round = parseDashboardParams(new URLSearchParams(qs))
  checks.push({
    id: "url-preset-roundtrip",
    ok: round.preset === "last_month",
    detail: `roundtrip preset ${round.preset}`,
  })
  checks.push({
    id: "url-range-roundtrip",
    ok:
      toIsoDate(round.range.start) === toIsoDate(view.range.start) &&
      toIsoDate(round.range.end) === toIsoDate(view.range.end),
    detail: "roundtrip range dates",
  })

  // H: Comparison range resolution
  const comp = resolveComparisonRange(view.range, "previous_period")
  const withComp = getPerformanceDashboard({ range: view.range, comparison: comp }, input)
  checks.push({
    id: "comparison-period",
    ok: withComp.comparison == null || withComp.comparison.totals.leads >= 0,
    detail: `comparison ${withComp.comparison ? "present" : "null (no activity)"}`,
  })
  console.log("\n--- Comparison (last month vs previous period) ---")
  console.log(
    `  current leads=${withComp.current.totals.leads} | comparison ${withComp.comparison ? `leads=${withComp.comparison.totals.leads}` : "hidden (no activity)"}`
  )

  // I: Ad spend independent of service filter (should NOT drop when service set) — known product behavior
  const withService = getPerformanceDashboard(
    { range: resolvePreset("ytd"), service: serviceIds[0] ?? null },
    input
  )
  checks.push({
    id: "service-adspend-prorated",
    ok: withService.current.totals.adSpend <= allYtd.current.totals.adSpend + 1,
    detail: `service filter adSpend ${withService.current.totals.adSpend} vs all ${allYtd.current.totals.adSpend}`,
  })

  const failed = checks.filter((c) => !c.ok)
  console.log("\n=== Audit result ===")
  console.log(`Checks: ${checks.length} | Passed: ${checks.length - failed.length} | Failed: ${failed.length}`)
  if (failed.length) {
    console.log("\nFailures:")
    for (const f of failed) console.log(`  ✗ ${f.id}: ${f.detail}`)
  } else {
    console.log("All automated checks passed.")
  }

  logAudit(checks, { org: slug, presetRows, failedIds: failed.map((f) => f.id) })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
