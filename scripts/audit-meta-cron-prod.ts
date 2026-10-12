/**
 * Read-only audit: cron batches, syncable clients, SunTech metrics.
 * Run: npx tsx scripts/audit-meta-cron-prod.ts
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

import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const admin = createAdminClient()
  const slug = process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic"

  const { data: org } = await admin
    .from("organizations")
    .select("id,slug,name,demo_mode")
    .eq("slug", slug)
    .maybeSingle()

  console.log("\n=== Organization ===")
  console.log(org)

  if (org?.id) {
    const { data: cfg } = await admin
      .from("client_meta_config")
      .select(
        "enabled,meta_ad_account_id,meta_sync_status,meta_sync_error,meta_last_synced_at"
      )
      .eq("organization_id", org.id)
      .maybeSingle()
    console.log("\n=== Meta config ===")
    console.log(cfg)

    const { data: metrics } = await admin
      .from("client_ad_metrics")
      .select("month_key,spend,impressions,clicks,synced_at,payload")
      .eq("organization_id", org.id)
      .order("month_key", { ascending: false })
      .limit(8)
    console.log("\n=== Recent ad metrics (DB) ===")
    console.log(metrics)

    const { data: runs } = await admin
      .from("meta_sync_runs")
      .select("status,message,started_at,finished_at,details")
      .eq("organization_id", org.id)
      .order("started_at", { ascending: false })
      .limit(10)
    console.log("\n=== Recent sync runs ===")
    for (const run of runs ?? []) {
      const details = run.details as Record<string, unknown> | null
      console.log({
        status: run.status,
        message: run.message,
        started: run.started_at,
        source: details?.source,
        metricsRange: details?.metricsRange,
        monthCount: details?.monthCount,
      })
    }
  }

  const { data: batches } = await admin
    .from("meta_sync_batches")
    .select("id,source,started_at,finished_at,total,synced,skipped,failed")
    .order("started_at", { ascending: false })
    .limit(12)
  console.log("\n=== Recent sync batches (all sources) ===")
  console.log(batches)

  const cronBatches = (batches ?? []).filter((b) =>
    ["vercel-cron", "cron"].includes(String(b.source))
  )
  console.log("\n=== Cron batches in window ===")
  console.log(cronBatches)

  const { data: syncable } = await admin
    .from("client_meta_config")
    .select("organization_id,enabled,meta_ad_account_id,meta_last_synced_at,meta_sync_status")
    .eq("enabled", true)
    .not("meta_ad_account_id", "is", null)

  console.log("\n=== Syncable clients (enabled + ad account) ===")
  console.log(`count: ${syncable?.length ?? 0}`)
  const staleCutoff = Date.now() - 6 * 60 * 60 * 1000
  for (const row of syncable ?? []) {
    const last = row.meta_last_synced_at
      ? new Date(row.meta_last_synced_at).getTime()
      : 0
    const stale = !last || last < staleCutoff
    if (stale) {
      console.log("STALE", {
        organizationId: row.organization_id,
        status: row.meta_sync_status,
        metaLastSyncedAt: row.meta_last_synced_at,
      })
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
