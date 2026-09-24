/** Match Vercel cron interval for ad metrics (hours). */
export const META_METRICS_STALE_HOURS = 6

/** Keep meta_sync_runs / meta_sync_batches for ops visibility only. */
export const META_SYNC_LOG_RETENTION_DAYS = 3

export const META_METRICS_CRON_SCHEDULE_UTC = "0 */6 * * *"

export const META_LEADS_CRON_SCHEDULE_UTC = "0 2 * * *"

export function isMetaMetricsStale(
  metaLastSyncedAt: string | null,
  nowMs = Date.now()
): boolean {
  if (!metaLastSyncedAt) return true
  const syncedMs = new Date(metaLastSyncedAt).getTime()
  if (Number.isNaN(syncedMs)) return true
  const ageMs = nowMs - syncedMs
  return ageMs > META_METRICS_STALE_HOURS * 60 * 60 * 1000
}
