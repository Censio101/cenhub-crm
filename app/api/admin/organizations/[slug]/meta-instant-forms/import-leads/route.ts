import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOrganizationIdFromSlug,
  importMetaInstantLeads,
} from "@/lib/meta/meta-instant-forms-service"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { daysBack?: number; metaFormIds?: string[] }
    const admin = createAdminClient()
    const organizationId = await getOrganizationIdFromSlug(admin, slug)
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const result = await importMetaInstantLeads(admin, organizationId, {
      daysBack: body.daysBack ?? 90,
      metaFormIds: body.metaFormIds,
    })
    return NextResponse.json(result)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
