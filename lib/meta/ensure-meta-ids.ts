import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getMetaConfigRow,
  upsertMetaConfig,
} from "@/lib/db/meta-config-repository"
import { discoverPageIdFromAdAccount } from "@/lib/meta/discover-page-id"
import { fetchPartnerAdAccounts } from "@/lib/meta/ad-accounts"
import { matchPartnerAdAccountId } from "@/lib/meta/match-partner-account"
import { resolveMetaAccessToken } from "@/lib/meta/token"

export type EnsureMetaIdsResult = {
  adAccountDiscovered: boolean
  pageIdDiscovered: boolean
}

export async function ensureMetaIdsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  options: { organizationName?: string } = {}
): Promise<EnsureMetaIdsResult> {
  const row = await getMetaConfigRow(supabase, organizationId)
  if (!row?.enabled) {
    return { adAccountDiscovered: false, pageIdDiscovered: false }
  }

  let adAccountDiscovered = false
  let adAccountId = String(row.meta_ad_account_id || "").trim()

  if (!adAccountId && options.organizationName) {
    const partner = await fetchPartnerAdAccounts()
    if (!partner.error) {
      const matched = matchPartnerAdAccountId(options.organizationName, partner.accounts)
      if (matched) {
        adAccountId = matched
        await upsertMetaConfig(supabase, organizationId, { metaAdAccountId: matched })
        adAccountDiscovered = true
      }
    }
  }

  const updated = await getMetaConfigRow(supabase, organizationId)
  adAccountId = String(updated?.meta_ad_account_id || adAccountId).trim()
  const pageId = String(updated?.meta_page_id || "").trim()

  if (!adAccountId || pageId) {
    return { adAccountDiscovered, pageIdDiscovered: false }
  }

  const resolved = resolveMetaAccessToken()
  if (!resolved.token) {
    return { adAccountDiscovered, pageIdDiscovered: false }
  }

  const discoveredPageId = await discoverPageIdFromAdAccount(adAccountId, resolved.token)
  if (!discoveredPageId) {
    return { adAccountDiscovered, pageIdDiscovered: false }
  }

  await upsertMetaConfig(supabase, organizationId, { metaPageId: discoveredPageId })
  return { adAccountDiscovered, pageIdDiscovered: true }
}
