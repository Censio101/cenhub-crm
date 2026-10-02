import { getMetaConfigRow, listMetaSyncableOrganizations } from "@/lib/db/meta-config-repository"
import { importMetaInstantLeads } from "@/lib/meta/meta-instant-forms-service"
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

  try {
    const result = await importMetaInstantLeads(supabase, organizationId, {
      daysBack: options.daysBack ?? 30,
    })
    if (result.skipped) {
      return {
        organizationId,
        skipped: true,
        reason: result.reason ?? "No enabled forms.",
        imported: 0,
        scanned: 0,
      }
    }
    return {
      organizationId,
      skipped: false,
      scanned: result.scanned,
      imported: result.imported,
    }
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
