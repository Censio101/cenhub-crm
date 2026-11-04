import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { updateOrganizationById } from "@/lib/db/organizations-repository"
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

function canManageOrganizationLogo(role: string | null): boolean {
  return role === "client_admin" || role === "censio_admin"
}

export async function POST(request: Request) {
  try {
    const ctx = await requireOrganizationContext()
    if (!canManageOrganizationLogo(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Role verified above; target is the caller's own organization (storage RLS blocks client admins).
    const { path } = await uploadOrganizationLogo(createAdminClient(), ctx.organization.id, file)
    const logoUrl = resolveOrganizationLogoUrl(path)

    return NextResponse.json({ logoUrl, logoPath: path })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid file type") {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message === "File too large") {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error(error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireOrganizationContext()
    if (!canManageOrganizationLogo(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      background?: unknown
      padding?: unknown
      radius?: unknown
      size?: unknown
      offsetY?: unknown
    }
    // Any field can be sent on its own; only valid values are saved.
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

    await updateOrganizationById(createAdminClient(), ctx.organization.id, patch)

    return NextResponse.json({
      logoBackground: patch.logo_background,
      logoPadding: patch.logo_padding,
      logoRadius: patch.logo_radius,
      logoSize: patch.logo_size,
      logoOffsetY: patch.logo_offset_y,
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error(error)
    return NextResponse.json({ error: "Could not update logo background" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const ctx = await requireOrganizationContext()
    if (!canManageOrganizationLogo(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await clearOrganizationLogo(
      createAdminClient(),
      ctx.organization.id,
      ctx.organization.logo_url
    )

    return NextResponse.json({ logoUrl: null })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error(error)
    return NextResponse.json({ error: "Could not remove logo" }, { status: 500 })
  }
}
