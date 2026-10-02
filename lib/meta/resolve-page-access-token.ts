import { getMetaConfigRow, type MetaConfigRow } from "@/lib/db/meta-config-repository"
import { decryptSecret, encryptSecret, hasSecretEncryptionKey } from "@/lib/meta/crypto"
import { graphFetch, resolveMetaAccessToken, GRAPH_VERSION } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

async function fetchPageAccessTokenFromGraph(
  pageId: string,
  systemOrUserToken: string
): Promise<string> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=access_token`
  const data = await graphFetch<{ access_token?: string }>(url, systemOrUserToken)
  const token = String(data.access_token || "").trim()
  if (!token) throw new Error("Meta did not return a page access token for this Page.")
  return token
}

export async function resolvePageAccessTokenForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  options: { persist?: boolean } = {}
): Promise<{ token: string; pageId: string; config: MetaConfigRow }> {
  const config = await getMetaConfigRow(supabase, organizationId)
  if (!config) throw new Error("Meta is not configured for this client.")
  const pageId = String(config.meta_page_id || "").trim()
  if (!pageId) throw new Error("Missing Meta Page ID for this client.")

  const storedPage = config.meta_page_access_token_encrypted
    ? decryptSecret(config.meta_page_access_token_encrypted)
    : ""
  if (storedPage.trim()) {
    return { token: storedPage.trim(), pageId, config }
  }

  const resolved = resolveMetaAccessToken({
    metaSystemUserToken: config.meta_system_user_token_encrypted
      ? decryptSecret(config.meta_system_user_token_encrypted)
      : "",
    metaPageAccessToken: "",
  })
  const bootstrap = resolved.token || resolveMetaAccessToken().token
  if (!bootstrap) {
    throw new Error(resolved.reason ?? "Missing Meta system user token.")
  }

  const pageToken = await fetchPageAccessTokenFromGraph(pageId, bootstrap)

  if (options.persist !== false && hasSecretEncryptionKey()) {
    const encrypted = encryptSecret(pageToken)
    const { error } = await supabase
      .from("client_meta_config")
      .update({ meta_page_access_token_encrypted: encrypted })
      .eq("organization_id", organizationId)
    if (error) throw error
  }

  return { token: pageToken, pageId, config }
}

/** System user token (ads_read on ad account). Falls back to env system token. */
export function resolveMarketingAccessTokenForConfig(config: MetaConfigRow): string {
  const fromRow = resolveMetaAccessToken({
    metaSystemUserToken: config.meta_system_user_token_encrypted
      ? decryptSecret(config.meta_system_user_token_encrypted)
      : "",
  })
  if (fromRow.token) return fromRow.token
  const env = resolveMetaAccessToken()
  if (env.token) return env.token
  return ""
}
