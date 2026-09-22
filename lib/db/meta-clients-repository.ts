import type { SupabaseClient } from "@supabase/supabase-js"

import type { MetaConfigRow } from "@/lib/db/meta-config-repository"
import type { OrganizationRow } from "@/lib/db/types"

export type MetaClientStatus = "live" | "off" | "needs-setup" | "error"

export type MetaClientSummary = {
  organizationId: string
  slug: string
  name: string
  demoMode: boolean
  metaAdAccountId: string
  metaPageId: string
  metaPixelId: string
  enabled: boolean
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
  needsSetup: boolean
  status: MetaClientStatus
  inApp: true
}

export type MetaPartnerClientSummary = {
  metaAdAccountId: string
  accountName: string
  currency: string
  needsSetup: true
  inApp: false
  status: "needs-setup"
  linkedSlug: string | null
}

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

export function deriveMetaClientStatus(input: {
  enabled: boolean
  metaAdAccountId: string
  metaPageId: string
  metaSyncStatus: string
}): { needsSetup: boolean; status: MetaClientStatus } {
  const hasAdAccount = Boolean(input.metaAdAccountId.trim())
  const hasPageId = Boolean(input.metaPageId.trim())

  if (!input.enabled) {
    return {
      needsSetup: !hasAdAccount || !hasPageId,
      status: "off",
    }
  }

  if (!hasAdAccount || !hasPageId) {
    return { needsSetup: true, status: "needs-setup" }
  }

  if (input.metaSyncStatus === "error") {
    return { needsSetup: false, status: "error" }
  }

  return { needsSetup: false, status: "live" }
}

export async function listMetaClients(
  supabase: SupabaseClient
): Promise<MetaClientSummary[]> {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error

  const { data: metaRows, error: metaError } = await supabase
    .from("client_meta_config")
    .select("*")

  if (metaError) throw metaError

  const metaByOrg = new Map(
    ((metaRows ?? []) as MetaConfigRow[]).map((row) => [row.organization_id, row])
  )

  return ((organizations ?? []) as OrganizationRow[]).map((organization) => {
    const meta = metaByOrg.get(organization.id)
    const metaAdAccountId = meta?.meta_ad_account_id ?? ""
    const metaPageId = meta?.meta_page_id ?? ""
    const enabled = Boolean(meta?.enabled)
    const metaSyncStatus = meta?.meta_sync_status ?? "disabled"
    const derived = deriveMetaClientStatus({
      enabled,
      metaAdAccountId,
      metaPageId,
      metaSyncStatus,
    })

    return {
      organizationId: organization.id,
      slug: organization.slug,
      name: organization.name,
      demoMode: organization.demo_mode,
      metaAdAccountId,
      metaPageId,
      metaPixelId: meta?.meta_pixel_id ?? "",
      enabled,
      metaSyncStatus,
      metaSyncError: meta?.meta_sync_error ?? null,
      metaLastSyncedAt: meta?.meta_last_synced_at ?? null,
      needsSetup: derived.needsSetup,
      status: derived.status,
      inApp: true as const,
    }
  })
}

export function mergePartnerAccounts(
  clients: MetaClientSummary[],
  partnerAccounts: Array<{
    metaAdAccountId: string
    accountName: string
    currency: string
  }>
): MetaPartnerClientSummary[] {
  const linkedIds = new Set(
    clients
      .map((client) => normalizeAdAccountId(client.metaAdAccountId))
      .filter(Boolean)
  )

  const slugByAdAccount = new Map(
    clients
      .filter((client) => client.metaAdAccountId)
      .map((client) => [normalizeAdAccountId(client.metaAdAccountId), client.slug])
  )

  return partnerAccounts
    .filter((account) => !linkedIds.has(normalizeAdAccountId(account.metaAdAccountId)))
    .map((account) => ({
      metaAdAccountId: account.metaAdAccountId,
      accountName: account.accountName,
      currency: account.currency,
      needsSetup: true as const,
      inApp: false as const,
      status: "needs-setup" as const,
      linkedSlug: slugByAdAccount.get(normalizeAdAccountId(account.metaAdAccountId)) ?? null,
    }))
}
