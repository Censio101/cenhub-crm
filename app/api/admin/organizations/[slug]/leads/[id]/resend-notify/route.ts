import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resendLeadNotificationEmail } from "@/lib/leads/resend-lead-notify"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string; id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, id } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const result = await resendLeadNotificationEmail(admin, organization.id, id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
