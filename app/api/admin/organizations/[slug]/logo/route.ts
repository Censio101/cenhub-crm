import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug, updateOrganizationById } from "@/lib/db/organizations-repository"
import {
  isLogoStep,
  isOrganizationLogoBackground,
  resolveOrganizationLogoUrl,
} from "@/lib/organization-logo"
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      background?: unknown
      padding?: unknown
      radius?: unknown
      size?: unknown
      offsetY?: unknown
    }
    const patch: {
      logo_background?: string
      logo_padding?: number
      logo_radius?: number
      logo_size?: number
      logo_offset_y?: number
    } = {}
    if (body.background !== undefined) {
      if (!isOrganizationLogoBackground(body.background)) {
        return NextResponse.json({ error: "Invalid background" }, { status: 400 })
      }
      patch.logo_background = body.background
    }
    if (body.padding !== undefined) {
      if (!isLogoStep(body.padding)) {
        return NextResponse.json({ error: "Invalid padding" }, { status: 400 })
      }
      patch.logo_padding = body.padding
    }
    if (body.radius !== undefined) {
      if (!isLogoStep(body.radius)) {
        return NextResponse.json({ error: "Invalid radius" }, { status: 400 })
      }
      patch.logo_radius = body.radius
    }
    if (body.size !== undefined) {
      if (!isLogoStep(body.size)) {
        return NextResponse.json({ error: "Invalid size" }, { status: 400 })
      }
      patch.logo_size = body.size
    }
    if (body.offsetY !== undefined) {
      if (!isLogoStep(body.offsetY)) {
        return NextResponse.json({ error: "Invalid offsetY" }, { status: 400 })
      }
      patch.logo_offset_y = body.offsetY
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    await updateOrganizationById(admin, organization.id, patch)

    return NextResponse.json({
      logoBackground: patch.logo_background,
      logoPadding: patch.logo_padding,
      logoRadius: patch.logo_radius,
      logoSize: patch.logo_size,
      logoOffsetY: patch.logo_offset_y,
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
