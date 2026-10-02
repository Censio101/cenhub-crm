import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resolveOrganizationLogoUrl } from "@/lib/organization-logo"
import {
  clearOrganizationLogo,
  uploadOrganizationLogo,
} from "@/lib/organization-logo-upload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const { path } = await uploadOrganizationLogo(admin, organization.id, file)
    const logoUrl = resolveOrganizationLogoUrl(path)

    return NextResponse.json({ logoUrl, logoPath: path })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid file type" || error.message === "File too large") {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    await clearOrganizationLogo(admin, organization.id, organization.logo_url)

    return NextResponse.json({ logoUrl: null })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
