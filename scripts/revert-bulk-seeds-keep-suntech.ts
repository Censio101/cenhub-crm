/**
 * Undo `db:seed` + `db:seed-ad-metrics` on all clients; keep SunTech solar seed only.
 * Run: tsx scripts/revert-bulk-seeds-keep-suntech.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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

loadEnvLocal()

import { clearDemoOrganizationData } from "../lib/db/demo-organization-seed"
import { createAdminClient } from "../lib/supabase/admin"

const DEMO_ORG_SLUG = process.env.CRM_DEMO_ORG_SLUG ?? "nordkystens-tomrer"
const SUNTECH_SLUG = process.env.SUNTECH_ORG_SLUG ?? "suntech-nordic"

async function main() {
  const admin = createAdminClient()

  const { data: demoOrg } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", DEMO_ORG_SLUG)
    .maybeSingle()

  if (demoOrg?.id) {
    await clearDemoOrganizationData(admin, demoOrg.id)
    console.log(`Reverted demo org seed for ${demoOrg.name} (${demoOrg.slug})`)
  } else {
    console.log(`Demo org ${DEMO_ORG_SLUG} not found — skipped demo lead revert`)
  }

  const { data: demoMetrics, error: selectError } = await admin
    .from("client_ad_metrics")
    .select("id, organization_id, month_key, payload")

  if (selectError) throw selectError

  const demoIds =
    demoMetrics
      ?.filter((row) => {
        const payload = row.payload as { source?: string } | null
        return payload?.source === "demo"
      })
      .map((row) => row.id) ?? []

  if (demoIds.length > 0) {
    const { error: deleteError } = await admin
      .from("client_ad_metrics")
      .delete()
      .in("id", demoIds)
    if (deleteError) throw deleteError
    console.log(`Removed ${demoIds.length} demo ad-metric rows (all organizations)`)
  } else {
    console.log("No demo ad-metric rows to remove")
  }

  const { data: suntech } = await admin
    .from("organizations")
    .select("slug, name")
    .eq("slug", SUNTECH_SLUG)
    .maybeSingle()

  if (suntech) {
    console.log(
      `SunTech (${suntech.slug}) demo leads/metrics from bulk seeds reverted. Run: npm run db:seed-suntech`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
