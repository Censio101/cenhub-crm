import type { SupabaseClient } from "@supabase/supabase-js"

import { upsertMetaConfig } from "@/lib/db/meta-config-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"

export async function unlinkPartnerAdAccountFromOrganization(
  supabase: SupabaseClient,
  slug: string
): Promise<{ organizationId: string; slug: string }> {
  const organization = await getOrganizationBySlug(supabase, slug)
  if (!organization) {
    throw new Error("Organization not found")
  }

  await upsertMetaConfig(supabase, organization.id, {
    metaAdAccountId: "",
    enabled: false,
  })

  return { organizationId: organization.id, slug: organization.slug }
}
