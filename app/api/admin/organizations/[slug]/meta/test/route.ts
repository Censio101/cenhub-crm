import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { testMetaConnection } from "@/lib/meta/sync-ad-metrics"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const result = await testMetaConnection(admin, organization.id)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
