import { getMetaConfigRow, listMetaSyncableOrganizations } from "@/lib/db/meta-config-repository"
import { fetchMetaLeadsForOrganization } from "@/lib/meta/fetch-leads"
import { ingestMetaLead } from "@/lib/meta/ingest-lead"
import { decryptSecret } from "@/lib/meta/crypto"
import { resolveMetaAccessToken } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function reconcileOrganizationLeads(
  supabase: SupabaseClient,
  organizationId: string,
  options: { daysBack?: number } = {}
) {
  const row = await getMetaConfigRow(supabase, organizationId)
  if (!row?.enabled || !row.meta_page_id) {
    return {
      organizationId,
      skipped: true,
      reason: "Meta not enabled or page ID missing.",
      imported: 0,
      scanned: 0,
    }
  }

  const resolved = resolveMetaAccessToken({
    metaSystemUserToken: row.meta_system_user_token_encrypted
      ? decryptSecret(row.meta_system_user_token_encrypted)
      : "",
    metaPageAccessToken: row.meta_page_access_token_encrypted
      ? decryptSecret(row.meta_page_access_token_encrypted)
      : "",
  })
  if (!resolved.token) {
    return {
      organizationId,
      skipped: true,
      reason: resolved.reason ?? "Missing Meta token.",
      imported: 0,
      scanned: 0,
    }
  }

  let leads
  try {
    leads = await fetchMetaLeadsForOrganization(row, {
      withFields: true,
      daysBack: options.daysBack ?? 30,
    })
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Meta lead sync failed."
    return {
      organizationId,
      skipped: true,
      reason,
      imported: 0,
      scanned: 0,
    }
  }

  let imported = 0
  for (const lead of leads) {
    const result = await ingestMetaLead(supabase, organizationId, lead)
    if (result.created) imported += 1
  }

  return {
    organizationId,
    skipped: false,
    scanned: leads.length,
    imported,
  }
}

export async function reconcileAllOrganizationLeads(
  supabase: SupabaseClient,
  options: { daysBack?: number } = {}
) {
  const organizations = await listMetaSyncableOrganizations(supabase)
  const results = []

  for (const organization of organizations) {
    if (!organization.metaPageId) {
      results.push({
        organizationId: organization.organizationId,
        skipped: true,
        reason: "Missing Meta page ID.",
        imported: 0,
        scanned: 0,
      })
      continue
    }
    results.push(
      await reconcileOrganizationLeads(supabase, organization.organizationId, options)
    )
  }

  return results
}
