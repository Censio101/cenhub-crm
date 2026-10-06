import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import {
  isOrganizationProfileComplete,
  organizationProfileFromRow,
  parseOrganizationProfileBody,
} from "@/lib/organization-profile"
import { onboardingErrorMessage } from "@/lib/onboarding/api-errors"
import { updateOrganizationById } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function canEditOrganizationProfile(role: string | null): boolean {
  return role === "client_admin" || role === "censio_admin"
}

function validationErrorResponse(code: string) {
  return NextResponse.json({ error: code, message: onboardingErrorMessage(code) }, { status: 400 })
}

export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    const profile = organizationProfileFromRow(ctx.organization)
    return NextResponse.json({
      profile,
      slug: ctx.organization.slug,
      profileComplete: isOrganizationProfileComplete(ctx.organization),
    })
  } catch (error) {
    return organizationErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireOrganizationContext()
    if (!canEditOrganizationProfile(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = parseOrganizationProfileBody(body)
    if (!parsed.ok) {
      return validationErrorResponse(parsed.error)
    }

    const supabase =
      ctx.role === "censio_admin" || ctx.isDemoFallback
        ? createAdminClient()
        : await createClient()

    const organization = await updateOrganizationById(
      supabase,
      ctx.organization.id,
      parsed.patch
    )

    return NextResponse.json({
      profile: organizationProfileFromRow(organization),
      slug: organization.slug,
      profileComplete: isOrganizationProfileComplete(organization),
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error(error)
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 })
  }
}
