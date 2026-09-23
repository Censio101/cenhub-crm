import {
  listMetaClients,
  type MetaClientStatus,
} from "@/lib/db/meta-clients-repository"
import {
  listOrganizationsWithStats,
  type OrganizationSummary,
} from "@/lib/db/organizations-repository"
import { fetchPartnerAdAccounts } from "@/lib/meta/ad-accounts"
import type { SupabaseClient } from "@supabase/supabase-js"

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

export type HubClient = {
  key: string
  inApp: boolean
  partnerOnly: boolean
  organizationId: string | null
  slug: string | null
  name: string
  demo_mode: boolean
  isTestAccount: boolean
  leadCount: number
  userCount: number
  metaLive: boolean
  metaEnabled: boolean
  status: MetaClientStatus | "needs-setup"
  metaAdAccountId: string
  currency: string | null
}

export function isHubTestAccount(input: { name: string; demo_mode?: boolean }): boolean {
  return Boolean(input.demo_mode) || /\btest\b/i.test(input.name)
}

export function hubClientInEnabledTab(client: HubClient): boolean {
  return client.metaEnabled || client.isTestAccount
}

export function hubClientInNeedsSetupTab(client: HubClient): boolean {
  return !hubClientInEnabledTab(client)
}

export type HubClientsMeta = {
  businessId: string | null
  partnerFetchError: string | null
  partnerAccountCount: number
}

function toHubClient(
  meta: Awaited<ReturnType<typeof listMetaClients>>[number],
  org: OrganizationSummary
): HubClient {
  return {
    key: meta.organizationId,
    inApp: true,
    partnerOnly: false,
    organizationId: meta.organizationId,
    slug: meta.slug,
    name: meta.name,
    demo_mode: meta.demoMode,
    isTestAccount: isHubTestAccount({ name: meta.name, demo_mode: meta.demoMode }),
    leadCount: org.leadCount,
    userCount: org.userCount,
    metaLive: meta.status === "live",
    metaEnabled: meta.enabled,
    status: meta.status,
    metaAdAccountId: meta.metaAdAccountId,
    currency: null,
  }
}

export async function listHubClients(supabase: SupabaseClient): Promise<{
  clients: HubClient[]
  organizations: OrganizationSummary[]
  meta: HubClientsMeta
}> {
  const [metaClients, organizations, partner] = await Promise.all([
    listMetaClients(supabase),
    listOrganizationsWithStats(supabase),
    fetchPartnerAdAccounts(),
  ])

  const orgById = new Map(organizations.map((org) => [org.id, org]))
  const metaByAdAccount = new Map(
    metaClients
      .filter((client) => normalizeAdAccountId(client.metaAdAccountId))
      .map((client) => [normalizeAdAccountId(client.metaAdAccountId), client])
  )

  const clients: HubClient[] = []
  const seenOrgIds = new Set<string>()

  for (const account of partner.accounts) {
    const adId = normalizeAdAccountId(account.metaAdAccountId)
    const meta = metaByAdAccount.get(adId)

    if (meta) {
      seenOrgIds.add(meta.organizationId)
      const org = orgById.get(meta.organizationId)
      if (org) clients.push(toHubClient(meta, org))
      continue
    }

    clients.push({
      key: `partner:${adId}`,
      inApp: false,
      partnerOnly: true,
      organizationId: null,
      slug: null,
      name: account.accountName,
      demo_mode: true,
      isTestAccount: isHubTestAccount({ name: account.accountName, demo_mode: true }),
      leadCount: 0,
      userCount: 0,
      metaLive: false,
      metaEnabled: false,
      status: "needs-setup",
      metaAdAccountId: account.metaAdAccountId,
      currency: account.currency,
    })
  }

  for (const meta of metaClients) {
    if (seenOrgIds.has(meta.organizationId)) continue
    seenOrgIds.add(meta.organizationId)
    const org = orgById.get(meta.organizationId)
    if (org) clients.push(toHubClient(meta, org))
  }

  return {
    clients,
    organizations,
    meta: {
      businessId: partner.businessId,
      partnerFetchError: partner.error,
      partnerAccountCount: partner.accounts.length,
    },
  }
}
