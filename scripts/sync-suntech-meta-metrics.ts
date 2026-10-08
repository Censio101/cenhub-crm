/**
 * Sync Meta ad metrics for SunTech only.
 * Run: npx tsx scripts/sync-suntech-meta-metrics.ts
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

import { syncOrganizationAdMetrics } from "../lib/meta/sync-ad-metrics"
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

  const result = await syncOrganizationAdMetrics(admin, org.id, {
    source: "agent-verify-sync",
    metricsRange: "maximum",
  })

  console.log(JSON.stringify({ org: org.slug, ...result }, null, 2))
  if (!result.success) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
