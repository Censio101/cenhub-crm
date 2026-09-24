import type { SupabaseClient } from "@supabase/supabase-js"

export type MetaSyncBatchSummary = {
  synced: number
  skipped: number
  failed: number
  total: number
}

export type MetaSyncBatchRow = {
  id: string
  source: string
  started_at: string
  finished_at: string | null
  summary: MetaSyncBatchSummary
  triggered_by: string | null
}

const defaultSummary = (): MetaSyncBatchSummary => ({
  synced: 0,
  skipped: 0,
  failed: 0,
  total: 0,
})

function parseSummary(value: unknown): MetaSyncBatchSummary {
  if (!value || typeof value !== "object") return defaultSummary()
  const row = value as Record<string, unknown>
  return {
    synced: Number(row.synced) || 0,
    skipped: Number(row.skipped) || 0,
    failed: Number(row.failed) || 0,
    total: Number(row.total) || 0,
  }
}

export async function createMetaSyncBatch(
  supabase: SupabaseClient,
  input: { source: string; triggeredBy?: string | null; total?: number }
): Promise<string> {
  const summary: MetaSyncBatchSummary = {
    ...defaultSummary(),
    total: input.total ?? 0,
  }

  const { data, error } = await supabase
    .from("meta_sync_batches")
    .insert({
      source: input.source,
      triggered_by: input.triggeredBy ?? null,
      summary,
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id as string
}

export async function finishMetaSyncBatch(
  supabase: SupabaseClient,
  batchId: string,
  summary: MetaSyncBatchSummary
) {
  const { error } = await supabase
    .from("meta_sync_batches")
    .update({
      finished_at: new Date().toISOString(),
      summary,
    })
    .eq("id", batchId)

  if (error) throw error
}

export async function listRecentMetaSyncBatches(
  supabase: SupabaseClient,
  limit = 20
): Promise<MetaSyncBatchRow[]> {
  const { data, error } = await supabase
    .from("meta_sync_batches")
    .select("id, source, started_at, finished_at, summary, triggered_by")
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id as string,
    source: row.source as string,
    started_at: row.started_at as string,
    finished_at: (row.finished_at as string | null) ?? null,
    summary: parseSummary(row.summary),
    triggered_by: (row.triggered_by as string | null) ?? null,
  }))
}

export async function getLatestMetaSyncBatchBySource(
  supabase: SupabaseClient,
  source: string
): Promise<MetaSyncBatchRow | null> {
  const { data, error } = await supabase
    .from("meta_sync_batches")
    .select("id, source, started_at, finished_at, summary, triggered_by")
    .eq("source", source)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id as string,
    source: data.source as string,
    started_at: data.started_at as string,
    finished_at: (data.finished_at as string | null) ?? null,
    summary: parseSummary(data.summary),
    triggered_by: (data.triggered_by as string | null) ?? null,
  }
}

export function summarizeSyncResults(
  results: Array<{ success: boolean; skipped: boolean }>
): MetaSyncBatchSummary {
  const synced = results.filter((r) => r.success && !r.skipped).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.filter((r) => !r.success && !r.skipped).length
  return {
    synced,
    skipped,
    failed,
    total: results.length,
  }
}
