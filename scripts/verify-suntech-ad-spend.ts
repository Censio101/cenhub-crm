/**
 * Prints expected CRM dashboard ad spend totals for suntech-nordic (synced DB vs prorated range).
 * Run: npx tsx scripts/verify-suntech-ad-spend.ts
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
import { adSpendForRange } from "../lib/performance/ad-spend-for-range"
import { getPerformanceDashboard } from "../lib/performance/get-performance"
import { resolvePreset } from "../lib/performance/date-ranges"
import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"
  const admin = createAdminClient()
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !org) {
    throw error ?? new Error(`Organization not found: ${slug}`)
  }

  const { adSpendByMonth, source } = await listAdSpendByMonth(admin, org.id)
  const ytdRange = resolvePreset("ytd")
  const prorated = adSpendForRange(adSpendByMonth, ytdRange)
  const dashboard = getPerformanceDashboard({ range: ytdRange }, { leads: [], adSpendByMonth })

  const proratedSum = Object.values(prorated).reduce((a, b) => a + b, 0)

  console.log(`Organization: ${org.name} (${org.slug})`)
  console.log(`Ad spend API source: ${source}`)
  console.log(`Synced months in DB: ${Object.keys(adSpendByMonth).length}`)
  console.log(`YTD prorated sum (helper): ${Math.round(proratedSum)}`)
  console.log(`YTD dashboard totals.adSpend (engine): ${Math.round(dashboard.current.totals.adSpend)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
