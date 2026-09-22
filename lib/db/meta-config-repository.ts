import type { SupabaseClient } from "@supabase/supabase-js"

export type ClientMetaConfig = {
  organizationId: string
  metaAdAccountId: string
  metaPageId: string
  metaPixelId: string
  enabled: boolean
  metaSyncStatus: string
}

export async function getMetaConfig(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ClientMetaConfig | null> {
  const { data, error } = await supabase
    .from("client_meta_config")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    organizationId: data.organization_id,
    metaAdAccountId: data.meta_ad_account_id ?? "",
    metaPageId: data.meta_page_id ?? "",
    metaPixelId: data.meta_pixel_id ?? "",
    enabled: Boolean(data.enabled),
    metaSyncStatus: data.meta_sync_status ?? "disabled",
  }
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
  const { data, error } = await supabase
    .from("client_meta_config")
    .upsert(
      {
        organization_id: organizationId,
        meta_ad_account_id: input.metaAdAccountId ?? "",
        meta_page_id: input.metaPageId ?? "",
        meta_pixel_id: input.metaPixelId ?? "",
        enabled: input.enabled ?? false,
        meta_sync_status: "disabled",
      },
      { onConflict: "organization_id" }
    )
    .select("*")
    .single()

  if (error) throw error

  return {
    organizationId: data.organization_id,
    metaAdAccountId: data.meta_ad_account_id ?? "",
    metaPageId: data.meta_page_id ?? "",
    metaPixelId: data.meta_pixel_id ?? "",
    enabled: Boolean(data.enabled),
    metaSyncStatus: data.meta_sync_status ?? "disabled",
  }
}
