import type { SupabaseClient } from "@supabase/supabase-js"

import { META_SYNC_LOG_RETENTION_DAYS } from "@/lib/meta/sync-center-constants"

export type MetaSyncLogPurgeResult = {
  deletedRuns: number
  deletedBatches: number
  cutoff: string
  retentionDays: number
}

/** Drop sync run + batch rows older than retention (default 3 days). */
export async function purgeOldMetaSyncLogs(
  supabase: SupabaseClient,
  retentionDays = META_SYNC_LOG_RETENTION_DAYS
): Promise<MetaSyncLogPurgeResult> {
  const days = Math.max(1, Math.floor(retentionDays))
  const { data, error } = await supabase.rpc("purge_meta_sync_logs", {
    retention_days: days,
  })

  if (error) {
    throw error
  }

  const row = (data ?? {}) as Record<string, unknown>
  return {
    deletedRuns: Number(row.deletedRuns) || 0,
    deletedBatches: Number(row.deletedBatches) || 0,
    cutoff: String(row.cutoff ?? ""),
    retentionDays: Number(row.retentionDays) || days,
  }
}
