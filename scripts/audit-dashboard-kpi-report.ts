/**
 * Every KPI card + table metric on the performance dashboard, with formula checks.
 * Run: npx tsx scripts/audit-dashboard-kpi-report.ts
 */
import { readFileSync } from "node:fs"
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
import { computeLeadPipelineStats, filterDashboardLeads } from "../lib/leads"
import { DATE_PRESETS, resolvePreset, toIsoDate } from "../lib/performance/date-ranges"
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { computeProfit, getMetric, KPI_CARD_ORDER, tableMetrics } from "../lib/performance/metrics"
import { createAdminClient } from "../lib/supabase/admin"
import type { DatePreset, PeriodTotals } from "../lib/performance/types"

const KPI_GRID_ORDER = [
  "revenue",
  "profit",
  "roas",
  "customers",
  "adSpend",
  "closeRate",
  "cpl",
  "leads",
  "ltv",
  "cac",
] as const

function fmt(n: number | null, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n))
}

function verifyTotals(t: PeriodTotals): string[] {
  const issues: string[] = []
  const ltv = getMetric("ltv").compute(t)
  const expLtv = t.customers > 0 ? t.revenue / t.customers : null
  if ((ltv == null) !== (expLtv == null) || (ltv != null && expLtv != null && Math.abs(ltv - expLtv) > 0.01)) {
    issues.push(`LTV ${ltv} != revenue/customers ${expLtv}`)
  }
  const roas = getMetric("roas").compute(t)
  const expRoas = t.adSpend > 0 ? t.revenue / t.adSpend : null
  if ((roas == null) !== (expRoas == null) || (roas != null && expRoas != null && Math.abs(roas - expRoas) > 0.0001)) {
    issues.push(`ROAS mismatch`)
  }
  const profitShown = getMetric("profit").compute(t)
  const expProfit = computeProfit(t)
  if (Math.abs((profitShown ?? 0) - (expProfit ?? 0)) > 0.01) {
    issues.push(`profit metric mismatch`)
  }
  return issues
}

function printKpiBlock(label: string, t: PeriodTotals) {
  console.log(`\n### ${label}`)
  console.log("| Metric (UI) | Value | Formula |")
  console.log("|-------------|------:|---------|")
  for (const id of KPI_GRID_ORDER) {
    const m = getMetric(id)
    const v = m.compute(t)
    let formula = "—"
    switch (id) {
      case "revenue":
        formula = "Σ salesPrice (won)"
        break
      case "profit":
        formula = "Σ profit (won) or revenue − adSpend"
        break
      case "roas":
        formula = "revenue ÷ adSpend"
        break
      case "customers":
        formula = "count won"
        break
      case "adSpend":
        formula = "Meta client_ad_metrics (prorated)"
        break
      case "closeRate":
        formula = "customers ÷ leads × 100"
        break
      case "cpl":
        formula = "adSpend ÷ leads"
        break
      case "leads":
        formula = "count by lead date"
        break
      case "ltv":
        formula = "revenue ÷ customers"
        break
      case "cac":
        formula = "adSpend ÷ customers"
        break
    }
    console.log(`| ${m.label} | ${fmt(v, id === "roas" ? 2 : 0)} | ${formula} |`)
  }
  console.log(`| qualified (engine) | ${fmt(t.qualified ?? 0)} | pipeline statuses |`)
  console.log(`| quotes (engine) | ${fmt(t.quotes ?? 0)} | proposal+ statuses |`)
  const issues = verifyTotals(t)
  console.log(issues.length ? `Verify: FAIL ${issues.join("; ")}` : "Verify: OK (derived metrics match formulas)")
}

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org } = await admin.from("organizations").select("id, name, slug").eq("slug", slug).single()
  if (!org) throw new Error(`Org not found: ${slug}`)

  const [{ adSpendByMonth }, leads] = await Promise.all([
    listAdSpendByMonth(admin, org.id),
    listLeadsForOrganization(admin, org.id),
  ])
  const input = { leads, adSpendByMonth }

  console.log(`# SunTech dashboard KPI report — ${org.name}`)
  console.log(`Data: ${leads.length} leads | ad spend months: ${Object.keys(adSpendByMonth).length}`)
  console.log(`KPI grid order: ${KPI_GRID_ORDER.join(", ")}`)
  console.log(`Table columns: ${tableMetrics().map((m) => m.id).join(", ")}`)

  for (const { id } of DATE_PRESETS) {
    if (id === "custom") continue
    const range = resolvePreset(id)
    const data = getPerformanceDashboard({ range }, input)
    printKpiBlock(`Preset: ${id} (${toIsoDate(range.start)} → ${toIsoDate(range.end)})`, data.current.totals)
  }

  const ytdRange = resolvePreset("ytd")
  const ytdData = getPerformanceDashboard({ range: ytdRange }, input)
  const filtered = filterDashboardLeads(leads, { range: ytdRange })
  const pipe = computeLeadPipelineStats(filtered)
  console.log("\n### Pipeline bar (YTD filtered leads — UI uses same filters)")
  console.log(`| open | ${pipe.openCount} | won | ${pipe.wonCount} | lost | ${pipe.lostCount} |`)
  console.log(`| pipeline value (open salesPrice) | ${Math.round(pipe.pipelineValue)} | won value | ${Math.round(pipe.wonValue)} |`)
  console.log(`| close rate (pipeline) | ${pipe.closeRate?.toFixed(1) ?? "—"}% | vs dashboard closeRate | ${fmt(getMetric("closeRate").compute(ytdData.current.totals), 1)}% |`)

  console.log("\n### Year table — monthly rows (2026)")
  console.log("| Month | " + tableMetrics().map((m) => m.id).join(" | ") + " |")
  console.log("|-------|" + tableMetrics().map(() => "------:").join("|") + "|")
  for (let m = 0; m < 12; m += 1) {
    const start = startOfMonth(new Date(2026, m, 1))
    const end = endOfMonth(start)
    const dash = getPerformanceDashboard({ range: { start, end } }, input)
    const t = dash.current.totals
    const cells = tableMetrics().map((metric) => fmt(metric.compute(t), metric.id === "closeRate" ? 1 : 0))
    console.log(`| ${2026}-${String(m + 1).padStart(2, "0")} | ${cells.join(" | ")} |`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
