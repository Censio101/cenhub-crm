/**
 * Server-side dashboard preset totals for SunTech (same engine as UI).
 * Run: npx tsx scripts/verify-dashboard-presets.ts
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
import { listLeadsForOrganization } from "../lib/db/leads-repository"
import { DATE_PRESETS, resolvePreset } from "../lib/performance/date-ranges"
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { createAdminClient } from "../lib/supabase/admin"
import type { DatePreset } from "../lib/performance/types"

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()
  if (error || !org) throw error ?? new Error(`Org not found: ${slug}`)

  const [{ adSpendByMonth, source }, leads] = await Promise.all([
    listAdSpendByMonth(admin, org.id),
    listLeadsForOrganization(admin, org.id),
  ])

  console.log(`${org.name} | leads: ${leads.length} | ad source: ${source} | months: ${Object.keys(adSpendByMonth).length}\n`)

  const presets = DATE_PRESETS.map((p) => p.id).filter((id) => id !== "custom") as DatePreset[]

  for (const preset of presets) {
    const range = resolvePreset(preset)
    const dash = getPerformanceDashboard({ range }, { leads, adSpendByMonth })
    const t = dash.current.totals
    console.log(
      `${preset.padEnd(18)} leads=${String(t.leads).padStart(3)} adSpend=${t.adSpend.toFixed(3)} revenue=${t.revenue.toFixed(0)}`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
