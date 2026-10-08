import type { SupabaseClient } from "@supabase/supabase-js"

import type { PortalAccess } from "@/lib/auth/portal-access"
import { inviteOrCreateUser } from "@/lib/db/admin-users"
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
  approvedByUserId: string
  access: PortalAccess
}

export type ProvisionClientResult = {
  organization: OrganizationRow
  application: OnboardingApplicationRow
  /** Null when the application was already approved and no login was created now. */
  accessMethod: PortalAccess["method"] | null
}

async function contactEmailAlreadyHasLogin(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
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
        accessMethod: null,
      }
    }
  }
  if (application.status !== "pending" && application.status !== "rejected") {
    throw new Error("Application cannot be approved in its current state")
  }

  if (await contactEmailAlreadyHasLogin(admin, application.contact_email)) {
    throw new Error("Contact email already has a login (another client or a Censio admin)")
  }

  const slug = await resolveAvailableOrganizationSlug(
    admin,
    application.company_name,
    options.slugOverride
  )

  let organization = await createOrganization(admin, {
    name: application.company_name,
    slug,
    demoMode: false,
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

  await inviteOrCreateUser(admin, {
    email: application.contact_email,
    role: "client_admin",
    organizationId: organization.id,
    organizationName: organization.name,
    method: options.access.method,
    password: options.access.method === "password" ? options.access.password : undefined,
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
    accessMethod: options.access.method,
  }
}
