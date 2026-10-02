import {
  listMetaClients,
  type MetaClientStatus,
} from "@/lib/db/meta-clients-repository"
import {
  listOrganizationsWithStats,
  type OrganizationSummary,
} from "@/lib/db/organizations-repository"
import { countMetaFormsNeedingRemapByOrganization } from "@/lib/db/meta-lead-forms-repository"
import { fetchPartnerAdAccounts } from "@/lib/meta/ad-accounts"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { OrganizationRow } from "@/lib/db/types"

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

/** Which lead sheet a client uses, for the client directory. */
export type HubClientLeadSheet = {
  name: string
  isSystemDefault: boolean
  /** True for a sheet that belongs to this client only. */
  isClientOwned: boolean
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
  /** Only filled by the picker list. */
  leadSheet?: HubClientLeadSheet | null
  /** The client's lead sheet changed while webhooks existed and is still to be reviewed. */
  webhookStale?: boolean
  /** Mapped Meta forms saved before the lead sheet last changed. */
  metaRemapCount?: number
}

export function isHubTestAccount(name: string): boolean {
  return /\btest\b/i.test(name)
}

type HubClientFilterInput = Pick<
  HubClient,
  "metaEnabled" | "inApp" | "demo_mode" | "partnerOnly"
>

/** Aktiveret: Meta is enabled for this client. */
export function hubClientInEnabledTab(client: HubClientFilterInput): boolean {
  return client.metaEnabled
}

/** Skal sættes op: unlinked BM accounts and in-app clients without Meta enabled. */
export function hubClientInNeedsSetupTab(client: HubClientFilterInput): boolean {
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
    isTestAccount: isHubTestAccount(meta.name),
    leadCount: org.leadCount,
    userCount: org.userCount,
    metaLive: meta.status === "live",
    metaEnabled: meta.enabled,
    status: meta.status,
    metaAdAccountId: meta.metaAdAccountId,
    currency: null,
  }
}

/** Lightweight in-app client list for scope bar, directory, and pickers (no Meta Graph, no lead/user counts). */
export async function listInAppClientsForPicker(supabase: SupabaseClient): Promise<{
  clients: HubClient[]
}> {
  const metaClients = await listMetaClients(supabase)
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error

  const { data: templateRows, error: templateError } = await supabase
    .from("lead_sheet_templates")
    .select("id, name, is_system_default, organization_id")
  if (templateError) throw templateError

  const templates = (templateRows ?? []) as Array<{
    id: string
    name: string
    is_system_default: boolean
    organization_id: string | null
  }>
  const templateById = new Map(templates.map((tpl) => [tpl.id, tpl]))
  const defaultTemplate = templates.find((tpl) => tpl.is_system_default) ?? null

  const orgById = new Map(
    ((organizations ?? []) as OrganizationRow[]).map((org) => [org.id, org])
  )
  const remapCounts = await countMetaFormsNeedingRemapByOrganization(
    supabase,
    (organizations ?? []) as OrganizationRow[]
  )

  const clients: HubClient[] = []
  for (const meta of metaClients) {
    const org = orgById.get(meta.organizationId)
    if (!org) continue
    clients.push({
      key: meta.organizationId,
      inApp: true,
      partnerOnly: false,
      organizationId: meta.organizationId,
      slug: meta.slug,
      name: meta.name,
      demo_mode: meta.demoMode,
      isTestAccount: isHubTestAccount(meta.name),
      leadCount: 0,
      userCount: 0,
      metaLive: meta.status === "live",
      metaEnabled: meta.enabled,
      status: meta.status,
      metaAdAccountId: meta.metaAdAccountId,
      currency: null,
      leadSheet: (() => {
        // A client without an explicit template uses the system default.
        const tpl =
          (org.lead_sheet_template_id ? templateById.get(org.lead_sheet_template_id) : null) ??
          defaultTemplate
        return tpl
          ? {
              name: tpl.name,
              isSystemDefault: tpl.is_system_default,
              isClientOwned: tpl.organization_id === org.id,
            }
          : null
      })(),
      webhookStale: Boolean(org.webhook_payload_stale_since),
      metaRemapCount: remapCounts.get(org.id) ?? 0,
    })
  }

  return { clients }
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
      demo_mode: false,
      isTestAccount: isHubTestAccount(account.accountName),
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
