import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { updateOrganizationById } from "@/lib/db/organizations-repository"
import { isOrganizationLogoBackground, resolveOrganizationLogoUrl } from "@/lib/organization-logo"
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

    const body = (await request.json().catch(() => ({}))) as { background?: unknown }
    if (!isOrganizationLogoBackground(body.background)) {
      return NextResponse.json({ error: "Invalid background" }, { status: 400 })
    }

    await updateOrganizationById(createAdminClient(), ctx.organization.id, {
      logo_background: body.background,
    })

    return NextResponse.json({ logoBackground: body.background })
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
