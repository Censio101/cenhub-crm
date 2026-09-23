import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMetaConfigRow,
} from "@/lib/db/meta-config-repository"
import { ensureMetaIdsForOrganization } from "@/lib/meta/ensure-meta-ids"
import { reconcileOrganizationLeads } from "@/lib/meta/reconcile-leads"
import { syncOrganizationAdMetrics } from "@/lib/meta/sync-ad-metrics"

export type MetaOnboardResult = {
  organizationId: string
  adAccountDiscovered: boolean
  pageIdDiscovered: boolean
  metrics: Awaited<ReturnType<typeof syncOrganizationAdMetrics>> | null
  leads: Awaited<ReturnType<typeof reconcileOrganizationLeads>> | null
}

export async function onboardMetaClient(
  supabase: SupabaseClient,
  organizationId: string,
  options: {
    source?: string
    organizationName?: string
    syncMetrics?: boolean
    syncLeads?: boolean
  } = {}
): Promise<MetaOnboardResult> {
  const source = options.source ?? "admin-onboard"
  const syncMetrics = options.syncMetrics ?? true
  const syncLeads = options.syncLeads ?? true

  let organizationName = options.organizationName
  if (!organizationName) {
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle()
    organizationName = organization?.name ?? undefined
  }

  const ensured = await ensureMetaIdsForOrganization(supabase, organizationId, {
    organizationName,
  })

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
    adAccountDiscovered: ensured.adAccountDiscovered,
    pageIdDiscovered: ensured.pageIdDiscovered,
    metrics,
    leads,
  }
}
