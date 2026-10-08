import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { deleteOrganizationBySlug } from "@/lib/db/delete-organization"
import {
  getOrganizationWithStatsBySlug,
  isOrganizationSlugTaken,
  normalizeOrgSlug,
  updateOrganizationBySlug,
} from "@/lib/db/organizations-repository"
import {
  isOrganizationProfileComplete,
  organizationProfileFromRow,
  parseOrganizationProfilePartialBody,
} from "@/lib/organization-profile"
import { onboardingErrorMessage } from "@/lib/onboarding/api-errors"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()

    const organization = await getOrganizationWithStatsBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = await request.json()

    const admin = createAdminClient()
    const existing = await getOrganizationWithStatsBySlug(admin, slug)
    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const parsed = parseOrganizationProfilePartialBody(body)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, message: onboardingErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    let targetSlug = slug
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
    if (typeof record.slug === "string" && record.slug.trim()) {
      const nextSlug = normalizeOrgSlug(record.slug.trim())
      if (nextSlug !== slug) {
        if (await isOrganizationSlugTaken(admin, nextSlug)) {
          return NextResponse.json({ error: "slug_taken" }, { status: 409 })
        }
        targetSlug = nextSlug
        parsed.patch.slug = nextSlug
      }
    }

    const organization = await updateOrganizationBySlug(admin, slug, parsed.patch)

    return NextResponse.json({
      organization,
      profile: organizationProfileFromRow(organization),
      profileComplete: isOrganizationProfileComplete(organization),
      slug: targetSlug,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const result = await deleteOrganizationBySlug(admin, slug)
    return NextResponse.json({ ok: true, organization: result })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
