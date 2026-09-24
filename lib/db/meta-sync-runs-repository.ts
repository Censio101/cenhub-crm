import type { SupabaseClient } from "@supabase/supabase-js"

export type MetaSyncRunStatus = "success" | "error" | "running" | "skipped"

export async function logMetaSyncRun(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    status: MetaSyncRunStatus
    message?: string | null
    details?: Record<string, unknown>
    startedAt?: string
    finishedAt?: string | null
    batchId?: string | null
  }
) {
  const { error } = await supabase.from("meta_sync_runs").insert({
    organization_id: input.organizationId,
    status: input.status,
    message: input.message ?? null,
    details: input.details ?? {},
    started_at: input.startedAt ?? new Date().toISOString(),
    finished_at: input.finishedAt ?? null,
    batch_id: input.batchId ?? null,
  })

  if (error) throw error
}

export async function listRecentMetaSyncRuns(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 5
) {
  const { data, error } = await supabase
    .from("meta_sync_runs")
    .select("id, status, message, details, started_at, finished_at, batch_id")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function listMetaSyncRunsForBatch(
  supabase: SupabaseClient,
  batchId: string
) {
  const { data, error } = await supabase
    .from("meta_sync_runs")
    .select(
      "id, organization_id, status, message, details, started_at, finished_at"
    )
    .eq("batch_id", batchId)
    .order("started_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

type LatestRunRow = {
  id: string
  organization_id: string
  status: string
  message: string | null
  started_at: string
  finished_at: string | null
}

export async function getLatestMetaSyncRunByOrganizationIds(
  supabase: SupabaseClient,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return new Map<string, LatestRunRow>()

  const { data, error } = await supabase
    .from("meta_sync_runs")
    .select("id, organization_id, status, message, started_at, finished_at")
    .in("organization_id", organizationIds)
    .order("started_at", { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as LatestRunRow[]
  const byOrg = new Map<string, LatestRunRow>()
  for (const row of rows) {
    const orgId = row.organization_id as string
    if (!byOrg.has(orgId)) byOrg.set(orgId, row)
  }
  return byOrg
}
