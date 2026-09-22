import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { listProfilesForOrganization } from "@/lib/db/admin-users"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const users = await listProfilesForOrganization(admin, organization.id)
    return NextResponse.json({ users })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
