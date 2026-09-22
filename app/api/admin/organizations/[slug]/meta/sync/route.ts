import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { reconcileOrganizationLeads } from "@/lib/meta/reconcile-leads"
import { syncOrganizationAdMetrics } from "@/lib/meta/sync-ad-metrics"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      scope?: "metrics" | "leads" | "all"
    }
    const scope = body.scope ?? "all"

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const metrics =
      scope === "leads"
        ? null
        : await syncOrganizationAdMetrics(admin, organization.id, {
            source: "admin-manual",
          })

    const leads =
      scope === "metrics"
        ? null
        : await reconcileOrganizationLeads(admin, organization.id, { daysBack: 30 })

    return NextResponse.json({
      success: true,
      metrics,
      leads,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
