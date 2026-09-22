import type { SupabaseClient } from "@supabase/supabase-js"

export type ClientMetaConfig = {
  organizationId: string
  metaAdAccountId: string
  metaPageId: string
  metaPixelId: string
  enabled: boolean
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
}

export type MetaConfigRow = {
  organization_id: string
  meta_ad_account_id: string | null
  meta_page_id: string | null
  meta_pixel_id: string | null
  meta_system_user_token_encrypted: string | null
  meta_page_access_token_encrypted: string | null
  meta_sync_status: string
  meta_sync_error: string | null
  meta_last_synced_at: string | null
  enabled: boolean
}

function rowToConfig(data: MetaConfigRow): ClientMetaConfig {
  return {
    organizationId: data.organization_id,
    metaAdAccountId: data.meta_ad_account_id ?? "",
    metaPageId: data.meta_page_id ?? "",
    metaPixelId: data.meta_pixel_id ?? "",
    enabled: Boolean(data.enabled),
    metaSyncStatus: data.meta_sync_status ?? "disabled",
    metaSyncError: data.meta_sync_error ?? null,
    metaLastSyncedAt: data.meta_last_synced_at ?? null,
  }
}

export async function getMetaConfigRow(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MetaConfigRow | null> {
  const { data, error } = await supabase
    .from("client_meta_config")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  return (data as MetaConfigRow | null) ?? null
}

export async function getMetaConfig(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ClientMetaConfig | null> {
  const data = await getMetaConfigRow(supabase, organizationId)
  if (!data) return null
  return rowToConfig(data)
}

export async function getOrganizationIdByPageId(
  supabase: SupabaseClient,
  pageId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("client_meta_config")
    .select("organization_id")
    .eq("meta_page_id", pageId)
    .eq("enabled", true)
    .maybeSingle()

  if (error) throw error
  return data?.organization_id ?? null
}

export async function listMetaSyncableOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("client_meta_config")
    .select("organization_id, meta_ad_account_id, meta_page_id, enabled")
    .eq("enabled", true)
    .not("meta_ad_account_id", "is", null)

  if (error) throw error

  return (data ?? []).map((row) => ({
    organizationId: row.organization_id as string,
    metaAdAccountId: row.meta_ad_account_id as string,
    metaPageId: (row.meta_page_id as string | null) ?? "",
  }))
}

export async function setMetaSyncState(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    metaSyncStatus: string
    metaSyncError?: string | null
    metaLastSyncedAt?: string | null
  }
) {
  const { error } = await supabase
    .from("client_meta_config")
    .update({
      meta_sync_status: input.metaSyncStatus,
      meta_sync_error: input.metaSyncError ?? null,
      meta_last_synced_at: input.metaLastSyncedAt ?? null,
    })
    .eq("organization_id", organizationId)

  if (error) throw error
}

export async function upsertMetaConfig(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    metaAdAccountId?: string
    metaPageId?: string
    metaPixelId?: string
    enabled?: boolean
  }
): Promise<ClientMetaConfig> {
  const existing = await getMetaConfigRow(supabase, organizationId)
  const enabled = input.enabled ?? existing?.enabled ?? false
  const metaAdAccountId =
    input.metaAdAccountId ?? existing?.meta_ad_account_id ?? ""
  const metaPageId = input.metaPageId ?? existing?.meta_page_id ?? ""
  const hasIds = Boolean(metaAdAccountId.trim() && metaPageId.trim())

  let metaSyncStatus = existing?.meta_sync_status ?? "disabled"
  if (!enabled) {
    metaSyncStatus = "disabled"
  } else if (hasIds && metaSyncStatus === "disabled") {
    metaSyncStatus = "pending"
  } else if (enabled && hasIds && !existing) {
    metaSyncStatus = "pending"
  }

  const { data, error } = await supabase
    .from("client_meta_config")
    .upsert(
      {
        organization_id: organizationId,
        meta_ad_account_id: metaAdAccountId,
        meta_page_id: metaPageId,
        meta_pixel_id: input.metaPixelId ?? existing?.meta_pixel_id ?? "",
        enabled,
        meta_sync_status: metaSyncStatus,
        meta_sync_error: enabled ? null : existing?.meta_sync_error ?? null,
      },
      { onConflict: "organization_id" }
    )
    .select("*")
    .single()

  if (error) throw error
  return rowToConfig(data as MetaConfigRow)
}

export async function patchMetaEnabled(
  supabase: SupabaseClient,
  organizationId: string,
  enabled: boolean
): Promise<ClientMetaConfig> {
  return upsertMetaConfig(supabase, organizationId, { enabled })
}
