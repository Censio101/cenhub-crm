import type { SupabaseClient } from "@supabase/supabase-js"

import { listProfilesForOrganization, removeOrganizationUser } from "@/lib/db/admin-users"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { clearPartnerAdAccountsCache } from "@/lib/meta/ad-accounts"
import { clearOrganizationLogo } from "@/lib/organization-logo-upload"

export async function deleteOrganizationBySlug(
  admin: SupabaseClient,
  slug: string
): Promise<{ id: string; slug: string; name: string }> {
  const organization = await getOrganizationBySlug(admin, slug)
  if (!organization) {
    throw new Error("Organization not found")
  }

  const profiles = await listProfilesForOrganization(admin, organization.id)
  for (const profile of profiles) {
    if (profile.role === "censio_admin") {
      throw new Error("Cannot delete organization: a Censio admin is linked to this client")
    }
    await removeOrganizationUser(admin, profile.id, organization.id)
  }

  if (organization.logo_url) {
    try {
      await clearOrganizationLogo(admin, organization.id, organization.logo_url)
    } catch {
      // Storage cleanup is best-effort; the org row is still removed below.
    }
  }

  const { error: applicationError } = await admin
    .from("onboarding_applications")
    .update({
      status: "rejected",
      rejection_reason: "Client workspace was deleted",
      organization_id: null,
    })
    .eq("organization_id", organization.id)

  if (applicationError) throw applicationError

  const { error: deleteError } = await admin
    .from("organizations")
    .delete()
    .eq("id", organization.id)

  if (deleteError) throw deleteError

  clearPartnerAdAccountsCache()

  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
  }
}
