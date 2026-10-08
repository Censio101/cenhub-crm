/**
 * Monthly audit grid for SunTech demo leads + dashboard engine (revenue, profit, LTV, ad spend).
 * Run: npx tsx scripts/audit-suntech-dashboard.ts
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
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { getMetric } from "../lib/performance/metrics"
import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()
  if (error || !org) throw error ?? new Error(`Org not found: ${slug}`)

  const [{ adSpendByMonth }, leads] = await Promise.all([
    listAdSpendByMonth(admin, org.id),
    listLeadsForOrganization(admin, org.id),
  ])

  const won = leads.filter((l) => l.status === "won")
  const withPrice = won.filter((l) => l.salesPrice != null)

  console.log(`\n=== ${org.name} dashboard audit ===`)
  console.log(`Leads: ${leads.length} | Won: ${won.length} | Won w/ salesPrice: ${withPrice.length}`)
  console.log(
    "LTV is NOT stored on leads — dashboard computes revenue ÷ closed customers for the selected period.\n"
  )

  console.log("Month     leads  customers  revenue    profit     LTV        adSpend")
  console.log("--------  -----  ---------  ---------  ---------  ---------  ---------")

  for (let m = 0; m < 12; m += 1) {
    const start = startOfMonth(new Date(2026, m, 1))
    const end = endOfMonth(start)
    const dash = getPerformanceDashboard({ range: { start, end } }, { leads, adSpendByMonth })
    const t = dash.current.totals
    const ltv = getMetric("ltv").compute(t)
    const monthKey = `${2026}-${String(m + 1).padStart(2, "0")}`
    console.log(
      `${monthKey}  ${String(t.leads).padStart(5)}  ${String(t.customers).padStart(9)}  ${String(Math.round(t.revenue)).padStart(9)}  ${String(Math.round(t.profit ?? 0)).padStart(9)}  ${ltv == null ? "       —" : String(Math.round(ltv)).padStart(9)}  ${String(Math.round(t.adSpend)).padStart(9)}`
    )
  }

  const ytdStart = startOfMonth(new Date(2026, 0, 1))
  const ytdEnd = new Date()
  const ytd = getPerformanceDashboard(
    { range: { start: ytdStart, end: ytdEnd } },
    { leads, adSpendByMonth }
  )
  const yt = ytd.current.totals
  const ytdLtv = getMetric("ltv").compute(yt)
  console.log("\n--- YTD (Jan 1 → today) ---")
  console.log(
    `leads=${yt.leads} customers=${yt.customers} revenue=${Math.round(yt.revenue)} profit=${Math.round(yt.profit ?? 0)} ltv=${ytdLtv == null ? "—" : Math.round(ytdLtv)} adSpend=${Math.round(yt.adSpend)}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
