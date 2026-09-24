import type { SupabaseClient } from "@supabase/supabase-js"

import {
  enablePartnerMetaAccount,
  listMetaClients,
} from "@/lib/db/meta-clients-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { onboardMetaClient } from "@/lib/meta/onboard-meta-client"

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

export type LinkPartnerToOrganizationInput = {
  slug: string
  metaAdAccountId: string
  accountName: string
}

export type LinkPartnerToOrganizationResult = {
  organization: { id: string; slug: string; name: string }
  metaAdAccountId: string
  enabled: boolean
  onboard: Awaited<ReturnType<typeof onboardMetaClient>> | null
}

export class MetaPartnerLinkConflictError extends Error {
  constructor(
    message: string,
    public linkedSlug: string,
    public linkedOrgName: string
  ) {
    super(message)
    this.name = "MetaPartnerLinkConflictError"
  }
}

export async function linkPartnerAdAccountToOrganization(
  supabase: SupabaseClient,
  input: LinkPartnerToOrganizationInput
): Promise<LinkPartnerToOrganizationResult> {
  const slug = input.slug.trim()
  const adAccountId = normalizeAdAccountId(input.metaAdAccountId)
  if (!adAccountId) {
    throw new Error("Invalid Meta ad account id")
  }

  const organization = await getOrganizationBySlug(supabase, slug)
  if (!organization) {
    throw new Error("Organization not found")
  }

  const clients = await listMetaClients(supabase)
  const existing = clients.find(
    (c) => normalizeAdAccountId(c.metaAdAccountId) === adAccountId
  )
  if (existing && existing.slug !== slug) {
    throw new MetaPartnerLinkConflictError(
      `This ad account is already linked to ${existing.name}.`,
      existing.slug,
      existing.name
    )
  }

  await enablePartnerMetaAccount(supabase, {
    metaAdAccountId: adAccountId,
    accountName: input.accountName.trim() || organization.name,
    enabled: true,
    slug,
  })

  const onboard = await onboardMetaClient(supabase, organization.id, {
    source: "onboarding-link",
    organizationName: organization.name,
  })

  return {
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    },
    metaAdAccountId: adAccountId,
    enabled: true,
    onboard,
  }
}
