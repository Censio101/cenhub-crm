import { listMetaClients } from "@/lib/db/meta-clients-repository"
import {
  getLatestMetaSyncBatchBySource,
  listRecentMetaSyncBatches,
} from "@/lib/db/meta-sync-batches-repository"
import { getLatestMetaSyncRunByOrganizationIds } from "@/lib/db/meta-sync-runs-repository"
import { isMetaMetricsStale } from "@/lib/meta/sync-center-constants"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function buildMetaSyncOverview(supabase: SupabaseClient) {
  const clients = await listMetaClients(supabase)
  const orgIds = clients.map((c) => c.organizationId)
  const latestRuns = await getLatestMetaSyncRunByOrganizationIds(supabase, orgIds)
  const batches = await listRecentMetaSyncBatches(supabase, 20)
  const lastCronBatch =
    (await getLatestMetaSyncBatchBySource(supabase, "vercel-cron")) ??
    (await getLatestMetaSyncBatchBySource(supabase, "cron"))

  let liveCount = 0
  let errorCount = 0
  let staleCount = 0
  let neverSyncedCount = 0
  let needsFirstSyncCount = 0

  const clientRows = clients.map((client) => {
    const isLive = client.status === "live"
    if (isLive) liveCount += 1
    if (client.status === "error") errorCount += 1

    const neverSynced = isLive && !client.metaLastSyncedAt
    const stale = isLive && isMetaMetricsStale(client.metaLastSyncedAt)
    if (neverSynced) neverSyncedCount += 1
    else if (stale) staleCount += 1
    if (neverSynced) needsFirstSyncCount += 1

    const lastRun = latestRuns.get(client.organizationId)

    return {
      organizationId: client.organizationId,
      slug: client.slug,
      name: client.name,
      demoMode: client.demoMode,
      metaAdAccountId: client.metaAdAccountId,
      metaPageId: client.metaPageId,
      enabled: client.enabled,
      status: client.status,
      needsSetup: client.needsSetup,
      metaSyncStatus: client.metaSyncStatus,
      metaSyncError: client.metaSyncError,
      metaLastSyncedAt: client.metaLastSyncedAt,
      stale: isLive && stale,
      neverSynced,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            message: lastRun.message,
            startedAt: lastRun.started_at,
            finishedAt: lastRun.finished_at,
          }
        : null,
    }
  })

  return {
    summary: {
      total: clients.length,
      liveCount,
      errorCount,
      staleCount,
      neverSyncedCount,
      needsFirstSyncCount,
      staleThresholdHours: 6,
    },
    schedule: {
      metricsCronUtc: "0 */6 * * *",
      leadsCronUtc: "0 2 * * *",
    },
    lastCronBatch,
    batches,
    clients: clientRows,
  }
}
