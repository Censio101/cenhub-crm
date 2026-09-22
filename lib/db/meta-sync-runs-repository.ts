import type { SupabaseClient } from "@supabase/supabase-js"

export async function logMetaSyncRun(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    status: "success" | "error" | "running"
    message?: string | null
    details?: Record<string, unknown>
    startedAt?: string
    finishedAt?: string | null
  }
) {
  const { error } = await supabase.from("meta_sync_runs").insert({
    organization_id: input.organizationId,
    status: input.status,
    message: input.message ?? null,
    details: input.details ?? {},
    started_at: input.startedAt ?? new Date().toISOString(),
    finished_at: input.finishedAt ?? null,
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
    .select("id, status, message, started_at, finished_at")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
