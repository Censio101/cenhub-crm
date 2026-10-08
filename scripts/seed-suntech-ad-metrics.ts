/**
 * Seed demo Meta ad spend for SunTech only (does not touch other clients).
 * Run: npm run db:seed-suntech-ad-metrics
 * Prefer real data: Meta sync on /admin/clients/suntech-nordic/meta-sync
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

import { DEMO_AD_SPEND_MONTHS } from "../lib/performance/demo-ad-spend"
import { createAdminClient } from "../lib/supabase/admin"

async function resolveSuntechSlug(admin: ReturnType<typeof createAdminClient>) {
  const preferred = process.env.SUNTECH_ORG_SLUG?.trim()
  const candidates = [preferred, "suntech-nordic", "suntech", "sun-tech"].filter(
    (s): s is string => Boolean(s)
  )
  for (const slug of [...new Set(candidates)]) {
    const { data } = await admin.from("organizations").select("slug").eq("slug", slug).maybeSingle()
    if (data?.slug) return data.slug as string
  }
  throw new Error("SunTech organization not found")
}

async function main() {
  const admin = createAdminClient()
  const slug = await resolveSuntechSlug(admin)
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single()
  if (error || !org) throw error ?? new Error(`Organization not found: ${slug}`)

  const rows = DEMO_AD_SPEND_MONTHS.map((month) => ({
    organization_id: org.id,
    month_key: month.monthKey,
    spend: month.spend,
    clicks: month.clicks,
    impressions: month.impressions,
    leads_count: null,
    payload: { source: "demo", note: "SunTech-only dev seed" },
  }))

  const { error: upsertError } = await admin
    .from("client_ad_metrics")
    .upsert(rows, { onConflict: "organization_id,month_key" })

  if (upsertError) throw upsertError

  console.log(`Seeded ${rows.length} ad months for ${org.name} (${slug}) only`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
