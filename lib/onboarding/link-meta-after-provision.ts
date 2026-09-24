import type { SupabaseClient } from "@supabase/supabase-js"

import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { deriveMetaClientStatus } from "@/lib/db/meta-clients-repository"
import type { OrganizationRow } from "@/lib/db/types"
import {
  linkPartnerAdAccountToOrganization,
  MetaPartnerLinkConflictError,
} from "@/lib/meta/link-partner-to-organization"

export type MetaLinkAfterProvisionResult =
  | {
      linked: true
      metaAdAccountId: string
      accountName: string
      onboard: unknown
      needsSetup: boolean
      metaSyncStatus: string
    }
  | {
      linked: false
      error: string
      conflict?: { linkedSlug: string; linkedOrgName: string }
    }

export async function tryLinkMetaAfterProvision(
  supabase: SupabaseClient,
  organization: OrganizationRow,
  input: { metaAdAccountId?: string; metaAccountName?: string }
): Promise<MetaLinkAfterProvisionResult | null> {
  const metaAdAccountId = input.metaAdAccountId?.trim()
  if (!metaAdAccountId) return null

  const accountName = input.metaAccountName?.trim() || organization.name

  try {
    const result = await linkPartnerAdAccountToOrganization(supabase, {
      slug: organization.slug,
      metaAdAccountId,
      accountName,
    })

    const row = await getMetaConfigRow(supabase, organization.id)
    const derived = deriveMetaClientStatus({
      enabled: Boolean(row?.enabled),
      metaAdAccountId: row?.meta_ad_account_id ?? metaAdAccountId,
      metaPageId: row?.meta_page_id ?? "",
      metaSyncStatus: row?.meta_sync_status ?? "",
    })

    return {
      linked: true,
      metaAdAccountId: result.metaAdAccountId,
      accountName,
      onboard: result.onboard,
      needsSetup: derived.needsSetup,
      metaSyncStatus: row?.meta_sync_status ?? "",
    }
  } catch (error) {
    if (error instanceof MetaPartnerLinkConflictError) {
      return {
        linked: false,
        error: error.message,
        conflict: {
          linkedSlug: error.linkedSlug,
          linkedOrgName: error.linkedOrgName,
        },
      }
    }
    return {
      linked: false,
      error: error instanceof Error ? error.message : "Could not link Meta ad account",
    }
  }
}
