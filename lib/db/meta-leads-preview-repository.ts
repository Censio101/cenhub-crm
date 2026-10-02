import type { SupabaseClient } from "@supabase/supabase-js"

import type { MetaInstantLeadPreviewRow } from "@/components/admin/meta-instant-forms/types"

export type MetaLeadsPreviewCacheMeta = {
  daysBack: number
  totalCount: number
  syncedAt: string | null
}

type PreviewRowDb = {
  meta_lead_id: string
  meta_form_id: string
  form_name: string
  created_time: string | null
  fields: Record<string, string> | null
}

export async function getMetaLeadsPreviewCacheMeta(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MetaLeadsPreviewCacheMeta | null> {
  const { data, error } = await supabase
    .from("meta_leads_preview_cache")
    .select("days_back, total_count, synced_at")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    daysBack: data.days_back as number,
    totalCount: data.total_count as number,
    syncedAt: data.synced_at as string | null,
  }
}

export async function listMetaLeadsPreviewFromCache(
  supabase: SupabaseClient,
  organizationId: string,
  options: { page: number; pageSize: number }
): Promise<{ rows: MetaInstantLeadPreviewRow[]; total: number }> {
  const { count, error: countError } = await supabase
    .from("meta_leads_preview_rows")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  if (countError) throw countError
  const total = count ?? 0

  const start = (options.page - 1) * options.pageSize
  const { data, error } = await supabase
    .from("meta_leads_preview_rows")
    .select("meta_lead_id, meta_form_id, form_name, created_time, fields")
    .eq("organization_id", organizationId)
    .order("created_time", { ascending: false, nullsFirst: false })
    .range(start, start + options.pageSize - 1)

  if (error) throw error

  const rows = ((data as PreviewRowDb[]) ?? []).map((row) => ({
    metaLeadId: row.meta_lead_id,
    metaFormId: row.meta_form_id,
    formName: row.form_name,
    createdTime: row.created_time,
    fields: (row.fields ?? {}) as Record<string, string>,
  }))

  return { rows, total }
}

async function listCachedMetaLeadIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("meta_leads_preview_rows")
    .select("meta_lead_id")
    .eq("organization_id", organizationId)

  if (error) throw error
  return new Set(
    (data ?? [])
      .map((row) => String(row.meta_lead_id || "").trim())
      .filter(Boolean)
  )
}

async function countMetaLeadsPreviewRows(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("meta_leads_preview_rows")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  if (error) throw error
  return count ?? 0
}

/** Add only leads not already stored; drop rows older than daysBack. */
export async function mergeMetaLeadsPreviewCache(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    daysBack: number
    leads: MetaInstantLeadPreviewRow[]
  }
): Promise<{ added: number; total: number }> {
  const existingIds = await listCachedMetaLeadIds(supabase, organizationId)
  const toInsert = input.leads.filter((lead) => !existingIds.has(lead.metaLeadId))

  if (toInsert.length > 0) {
    const chunkSize = 200
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize).map((lead) => ({
        organization_id: organizationId,
        meta_lead_id: lead.metaLeadId,
        meta_form_id: lead.metaFormId,
        form_name: lead.formName,
        created_time: lead.createdTime,
        fields: lead.fields,
      }))
      const { error: insertError } = await supabase.from("meta_leads_preview_rows").insert(chunk)
      if (insertError) throw insertError
    }
  }

  const cutoffMs =
    input.daysBack > 0 ? Date.now() - input.daysBack * 24 * 60 * 60 * 1000 : null
  if (cutoffMs) {
    const cutoffIso = new Date(cutoffMs).toISOString()
    const { error: pruneError } = await supabase
      .from("meta_leads_preview_rows")
      .delete()
      .eq("organization_id", organizationId)
      .lt("created_time", cutoffIso)

    if (pruneError) throw pruneError
  }

  const total = await countMetaLeadsPreviewRows(supabase, organizationId)

  const { error: upsertError } = await supabase.from("meta_leads_preview_cache").upsert(
    {
      organization_id: organizationId,
      days_back: input.daysBack,
      total_count: total,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  )

  if (upsertError) throw upsertError

  return { added: toInsert.length, total }
}
