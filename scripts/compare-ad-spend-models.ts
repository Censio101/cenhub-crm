/**
 * Compare CRM ad-spend math vs cenhub-style (Window Dashboard / analytics) month-key sums.
 * Run: npx tsx scripts/compare-ad-spend-models.ts
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

import { listAdSpendByMonth } from "../lib/db/ad-metrics-repository"
import { adSpendForRange, metaMonthPeriodDays } from "../lib/performance/ad-spend-for-range"
import { resolvePreset, toIsoDate } from "../lib/performance/date-ranges"
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { createAdminClient } from "../lib/supabase/admin"

const TZ = "Europe/Copenhagen"

function getNowParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? "2026"),
    month: Number(parts.find((p) => p.type === "month")?.value ?? "1"),
    day: Number(parts.find((p) => p.type === "day")?.value ?? "1"),
  }
}

/** Window Dashboard / analytics-style: sum full month rows whose YYYY-MM falls in range. */
function analyticsStyleAdSpend(
  adSpendByMonth: Record<string, number>,
  startMonth: string,
  endMonth: string
): number {
  return Object.entries(adSpendByMonth)
    .filter(([key]) => key >= startMonth && key <= endMonth)
    .reduce((sum, [, amount]) => sum + amount, 0)
}

function analyticsPeriodRange(period: "this-month" | "last-month" | "ytd-full-year"): {
  startMonth: string
  endMonth: string
  label: string
} {
  const { year, month } = getNowParts()
  const pad = (n: number) => String(n).padStart(2, "0")

  if (period === "this-month") {
    const key = `${year}-${pad(month)}`
    return { startMonth: key, endMonth: key, label: "this-month (Copenhagen)" }
  }
  if (period === "last-month") {
    const d = new Date(Date.UTC(year, month - 2, 1))
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
    return { startMonth: key, endMonth: key, label: "last-month (Copenhagen)" }
  }
  return {
    startMonth: `${year}-01`,
    endMonth: `${year}-12`,
    label: "calendar-year (Copenhagen, Jan–Dec full months)",
  }
}

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle()
  if (!org) throw new Error(`Org not found: ${slug}`)

  const { adSpendByMonth, source } = await listAdSpendByMonth(admin, org.id)
  const keys = Object.keys(adSpendByMonth).sort()
  const now = new Date()
  const { year, month } = getNowParts()
  const currentKey = `${year}-${String(month).padStart(2, "0")}`

  console.log(`\n=== ${org.name} (${org.slug}) ===`)
  console.log(`DB source: ${source} | synced months: ${keys.length}`)
  console.log(`Copenhagen today: ${year}-${String(month).padStart(2, "0")} (CRM presets use local date-fns)\n`)

  console.log("--- Period totals: CRM engine vs analytics-style month sum ---")

  const rows: Array<{
    label: string
    crm: number
    analytics: number
    delta: number
  }> = []

  const pairs: Array<{ name: string; crmPreset: Parameters<typeof resolvePreset>[0]; analytics: ReturnType<typeof analyticsPeriodRange> }> = [
    {
      name: "This month",
      crmPreset: "this_month",
      analytics: analyticsPeriodRange("this-month"),
    },
    {
      name: "Last month",
      crmPreset: "last_month",
      analytics: analyticsPeriodRange("last-month"),
    },
    {
      name: "YTD (CRM preset)",
      crmPreset: "ytd",
      analytics: {
        startMonth: `${year}-01`,
        endMonth: currentKey,
        label: "YTD Jan–current month (month keys)",
      },
    },
    {
      name: "Full calendar year",
      crmPreset: "ytd",
      analytics: analyticsPeriodRange("ytd-full-year"),
    },
  ]

  for (const row of pairs) {
    const crmRange = resolvePreset(row.crmPreset)
    const crmDash = getPerformanceDashboard({ range: crmRange }, { leads: [], adSpendByMonth })
    const crmTotal = crmDash.current.totals.adSpend
    const analyticsTotal = analyticsStyleAdSpend(
      adSpendByMonth,
      row.analytics.startMonth,
      row.analytics.endMonth
    )
    if (row.name === "Full calendar year") {
      const yearRange = {
        start: new Date(`${year}-01-01T00:00:00`),
        end: new Date(`${year}-12-31T23:59:59`),
      }
      const crmYear = getPerformanceDashboard({ range: yearRange }, { leads: [], adSpendByMonth })
      rows.push({
        label: row.name,
        crm: crmYear.current.totals.adSpend,
        analytics: analyticsTotal,
        delta: crmYear.current.totals.adSpend - analyticsTotal,
      })
    } else {
      rows.push({
        label: row.name,
        crm: crmTotal,
        analytics: analyticsTotal,
        delta: crmTotal - analyticsTotal,
      })
    }
  }

  for (const r of rows) {
    console.log(
      `${r.label.padEnd(22)} CRM: ${Math.round(r.crm).toLocaleString("da-DK")} | Analytics-style: ${Math.round(r.analytics).toLocaleString("da-DK")} | Δ ${Math.round(r.delta).toLocaleString("da-DK")}`
    )
  }

  console.log("\n--- 2026 monthly grid (DB spend vs CRM proration factor for partial ranges) ---")
  const ytdRange = resolvePreset("ytd")
  const prorated = adSpendForRange(adSpendByMonth, ytdRange)
  for (const key of keys.filter((k) => k.startsWith(String(year)))) {
    const raw = adSpendByMonth[key] ?? 0
    const pr = prorated[key] ?? 0
    const periodDays = metaMonthPeriodDays(key, now)
    console.log(
      `${key}  stored: ${Math.round(raw).toLocaleString("da-DK")}  CRM YTD slice: ${Math.round(pr).toLocaleString("da-DK")}  MTD/period days: ${periodDays}`
    )
  }

  console.log("\n--- Notes ---")
  console.log("- Analytics-style = sum of client_ad_metrics.month_key rows in range (no day proration).")
  console.log("- CRM = adSpendForRange + getPerformanceDashboard (day overlap; current month uses MTD period days).")
  console.log("- Full calendar year CRM uses Jan 1 – Dec 31 range; analytics UI may use same month-key sum.")
  console.log("- Demo seed rows (payload.source=demo) will not match live Meta on analytics.censio.dk.\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
