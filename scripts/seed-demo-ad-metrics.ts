/**
 * Seed shared fake Meta ad spend for every organization.
 * Run: npm run db:seed-ad-metrics
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { DEMO_AD_SPEND_MONTHS } from "../lib/performance/demo-ad-spend"
import { createAdminClient } from "../lib/supabase/admin"

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      const key = trimmed.slice(0, separator)
      const value = trimmed.slice(separator + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal()
  const admin = createAdminClient()

  const { data: organizations, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, name")

  if (orgError) throw orgError
  if (!organizations?.length) throw new Error("No organizations found")

  for (const organization of organizations) {
    const rows = DEMO_AD_SPEND_MONTHS.map((month) => ({
      organization_id: organization.id,
      month_key: month.monthKey,
      spend: month.spend,
      clicks: month.clicks,
      impressions: month.impressions,
      leads_count: null,
      payload: { source: "demo", note: "Shared fake Meta spend until Phase 4 sync" },
    }))

    const { error: deleteError } = await admin
      .from("client_ad_metrics")
      .delete()
      .eq("organization_id", organization.id)

    if (deleteError) throw deleteError

    const { error: insertError } = await admin.from("client_ad_metrics").insert(rows)
    if (insertError) throw insertError

    console.log(
      `Seeded ${rows.length} demo ad months for ${organization.name} (${organization.slug})`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
