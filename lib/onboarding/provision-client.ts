import type { SupabaseClient } from "@supabase/supabase-js"

import { inviteOrCreateUser } from "@/lib/db/admin-users"
import { seedDemoOrganizationData } from "@/lib/db/demo-organization-seed"
import {
  createOrganization,
  resolveAvailableOrganizationSlug,
  updateOrganizationBySlug,
} from "@/lib/db/organizations-repository"
import {
  getOnboardingApplicationById,
  markOnboardingApplicationApproved,
} from "@/lib/db/onboarding-applications-repository"
import type { OnboardingApplicationRow, OrganizationRow } from "@/lib/db/types"

export type ProvisionClientOptions = {
  slugOverride?: string
  demoMode?: boolean
  seedDemo?: boolean
  approvedByUserId: string
}

export type ProvisionClientResult = {
  organization: OrganizationRow
  application: OnboardingApplicationRow
  inviteSent: boolean
  demoSeed?: Awaited<ReturnType<typeof seedDemoOrganizationData>>
}

async function contactEmailAlreadyLinkedToClientOrg(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .in("role", ["client_admin", "client_user"])
    .not("organization_id", "is", null)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function provisionClientFromApplication(
  admin: SupabaseClient,
  applicationId: string,
  options: ProvisionClientOptions
): Promise<ProvisionClientResult> {
  const application = await getOnboardingApplicationById(admin, applicationId)
  if (!application) {
    throw new Error("Application not found")
  }
  if (application.status === "approved" && application.organization_id) {
    const { data: org, error } = await admin
      .from("organizations")
      .select("*")
      .eq("id", application.organization_id)
      .maybeSingle()
    if (error) throw error
    if (org) {
      return {
        organization: org as OrganizationRow,
        application,
        inviteSent: false,
      }
    }
  }
  if (application.status !== "pending" && application.status !== "rejected") {
    throw new Error("Application cannot be approved in its current state")
  }

  if (await contactEmailAlreadyLinkedToClientOrg(admin, application.contact_email)) {
    throw new Error("Contact email is already linked to a client account")
  }

  const slug = await resolveAvailableOrganizationSlug(
    admin,
    application.company_name,
    options.slugOverride
  )

  const demoMode = options.demoMode ?? false

  let organization = await createOrganization(admin, {
    name: application.company_name,
    slug,
    demoMode,
  })

  organization = await updateOrganizationBySlug(admin, organization.slug, {
    cvr: application.cvr,
    address: application.address,
    zip_code: application.zip_code,
    city: application.city,
    country: application.country,
    primary_contact_name: application.contact_full_name,
    primary_contact_email: application.contact_email,
    primary_contact_phone: application.contact_phone,
    website_url: application.website_url,
  })

  let demoSeed: ProvisionClientResult["demoSeed"]
  if (options.seedDemo || demoMode) {
    demoSeed = await seedDemoOrganizationData(admin, organization.id)
  }

  await inviteOrCreateUser(admin, {
    email: application.contact_email,
    role: "client_admin",
    organizationId: organization.id,
    organizationName: organization.name,
    method: "email",
    fullName: application.contact_full_name,
  })

  const updatedApplication = await markOnboardingApplicationApproved(
    admin,
    application.id,
    organization.id,
    options.approvedByUserId
  )

  return {
    organization,
    application: updatedApplication,
    inviteSent: true,
    demoSeed,
  }
}
