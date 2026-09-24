import {
  createMetaSyncBatch,
  finishMetaSyncBatch,
  summarizeSyncResults,
} from "@/lib/db/meta-sync-batches-repository"
import { purgeOldMetaSyncLogs } from "@/lib/db/meta-sync-log-retention"
import { listMetaSyncableOrganizations } from "@/lib/db/meta-config-repository"
import {
  syncAllOrganizationAdMetrics,
  type SyncOrganizationAdMetricsResult,
} from "@/lib/meta/sync-ad-metrics"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { MetricsInsightsRange } from "@/lib/meta/insights"

export async function runMetaMetricsSyncBatch(
  supabase: SupabaseClient,
  input: {
    source: string
    triggeredBy?: string | null
    metricsRange?: MetricsInsightsRange
    batchId?: string | null
  }
): Promise<{
  batchId: string | null
  results: SyncOrganizationAdMetricsResult[]
  summary: ReturnType<typeof summarizeSyncResults>
}> {
  const organizations = await listMetaSyncableOrganizations(supabase)
  let batchId = input.batchId ?? null

  if (!batchId) {
    batchId = await createMetaSyncBatch(supabase, {
      source: input.source,
      triggeredBy: input.triggeredBy ?? null,
      total: organizations.length,
    })
  }

  const results = await syncAllOrganizationAdMetrics(supabase, {
    source: input.source,
    batchId,
    metricsRange: input.metricsRange ?? "maximum",
  })

  const summary = summarizeSyncResults(results)
  await finishMetaSyncBatch(supabase, batchId, summary)

  try {
    await purgeOldMetaSyncLogs(supabase)
  } catch (purgeError) {
    console.error("purgeOldMetaSyncLogs failed:", purgeError)
  }

  return { batchId, results, summary }
}
