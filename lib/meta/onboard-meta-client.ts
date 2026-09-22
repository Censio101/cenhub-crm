import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMetaConfigRow,
  upsertMetaConfig,
} from "@/lib/db/meta-config-repository"
import { discoverPageIdFromAdAccount } from "@/lib/meta/discover-page-id"
import { reconcileOrganizationLeads } from "@/lib/meta/reconcile-leads"
import { syncOrganizationAdMetrics } from "@/lib/meta/sync-ad-metrics"
import { resolveMetaAccessToken } from "@/lib/meta/token"

export type MetaOnboardResult = {
  organizationId: string
  pageIdDiscovered: boolean
  metrics: Awaited<ReturnType<typeof syncOrganizationAdMetrics>> | null
  leads: Awaited<ReturnType<typeof reconcileOrganizationLeads>> | null
}

export async function onboardMetaClient(
  supabase: SupabaseClient,
  organizationId: string,
  options: {
    source?: string
    discoverPageId?: boolean
    syncMetrics?: boolean
    syncLeads?: boolean
  } = {}
): Promise<MetaOnboardResult> {
  const source = options.source ?? "admin-onboard"
  const discoverPageId = options.discoverPageId ?? true
  const syncMetrics = options.syncMetrics ?? true
  const syncLeads = options.syncLeads ?? true

  let pageIdDiscovered = false
  const row = await getMetaConfigRow(supabase, organizationId)

  if (discoverPageId && row?.enabled && row.meta_ad_account_id && !row.meta_page_id?.trim()) {
    const resolved = resolveMetaAccessToken()
    if (resolved.token) {
      const pageId = await discoverPageIdFromAdAccount(
        row.meta_ad_account_id,
        resolved.token
      )
      if (pageId) {
        await upsertMetaConfig(supabase, organizationId, { metaPageId: pageId })
        pageIdDiscovered = true
      }
    }
  }

  const updatedRow = await getMetaConfigRow(supabase, organizationId)
  const hasPageId = Boolean(updatedRow?.meta_page_id?.trim())

  const metrics =
    syncMetrics && updatedRow?.enabled && updatedRow.meta_ad_account_id
      ? await syncOrganizationAdMetrics(supabase, organizationId, { source })
      : null

  const leads =
    syncLeads && updatedRow?.enabled && hasPageId
      ? await reconcileOrganizationLeads(supabase, organizationId, { daysBack: 30 })
      : null

  return {
    organizationId,
    pageIdDiscovered,
    metrics,
    leads,
  }
}
