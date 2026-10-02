import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOrganizationIdFromSlug,
  subscribeOrganizationLeadgenWebhooks,
} from "@/lib/meta/meta-instant-forms-service"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organizationId = await getOrganizationIdFromSlug(admin, slug)
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const health = await subscribeOrganizationLeadgenWebhooks(admin, organizationId)
    return NextResponse.json({ health })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
