import { fetchAllGraphPages, resolveMetaAccessToken } from "@/lib/meta/token"
import type { MetaConfigRow } from "@/lib/db/meta-config-repository"
import { decryptSecret } from "@/lib/meta/crypto"
import type { MetaLeadPayload } from "@/lib/meta/lead-mapper"

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0"

function tokenFromConfig(row: MetaConfigRow) {
  return resolveMetaAccessToken({
    metaSystemUserToken: row.meta_system_user_token_encrypted
      ? decryptSecret(row.meta_system_user_token_encrypted)
      : "",
    metaPageAccessToken: row.meta_page_access_token_encrypted
      ? decryptSecret(row.meta_page_access_token_encrypted)
      : "",
  })
}

export async function fetchMetaLeadsForOrganization(
  row: MetaConfigRow,
  options: { withFields?: boolean; daysBack?: number } = {}
): Promise<MetaLeadPayload[]> {
  const pageId = String(row.meta_page_id || "").trim()
  if (!pageId) throw new Error("Missing Meta page ID.")

  const resolved = tokenFromConfig(row)
  if (!resolved.token) {
    throw new Error(resolved.reason ?? "Missing Meta token.")
  }

  const leadFields = options.withFields !== false
    ? "id,created_time,field_data,ad_id"
    : "id,created_time,ad_id"
  const formsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/leadgen_forms?fields=id,name,status,leads_count`
  const forms = await fetchAllGraphPages<{ id: string }>(formsUrl, resolved.token)

  const leads: MetaLeadPayload[] = []
  const cutoffMs =
    options.daysBack && options.daysBack > 0
      ? Date.now() - options.daysBack * 24 * 60 * 60 * 1000
      : null

  for (const form of forms) {
    const leadsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${form.id}/leads?fields=${leadFields}`
    const rows = await fetchAllGraphPages<MetaLeadPayload>(leadsUrl, resolved.token)
    for (const lead of rows) {
      if (cutoffMs && lead.created_time) {
        const created = new Date(lead.created_time).getTime()
        if (!Number.isNaN(created) && created < cutoffMs) continue
      }
      leads.push(lead)
    }
  }

  return leads
}
