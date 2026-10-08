import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { setOrganizationUserPassword } from "@/lib/db/admin-users"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string; id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { password?: unknown }

    if (typeof body.password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    await setOrganizationUserPassword(admin, id, organization.id, body.password)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
