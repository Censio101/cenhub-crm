import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOrganizationBySlug,
  updateOrganizationBySlug,
} from "@/lib/db/organizations-repository"
import { parseHvidbjergPartner } from "@/lib/hvidbjerg-partner"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { hvidbjergPartner?: unknown }

    if (typeof body.hvidbjergPartner !== "boolean") {
      return NextResponse.json({ error: "invalid_hvidbjerg_partner" }, { status: 400 })
    }

    const admin = createAdminClient()
    const existing = await getOrganizationBySlug(admin, slug)
    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const organization = await updateOrganizationBySlug(admin, slug, {
      hvidbjerg_partner: body.hvidbjergPartner,
    })

    return NextResponse.json({
      organization,
      hvidbjergPartner: parseHvidbjergPartner(organization.hvidbjerg_partner),
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
