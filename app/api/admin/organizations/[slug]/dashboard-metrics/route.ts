import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOrganizationBySlug,
  updateOrganizationBySlug,
} from "@/lib/db/organizations-repository"
import { HIDEABLE_METRIC_IDS, parseHiddenMetrics } from "@/lib/performance/visible-metrics"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

/** Which dashboard KPI metrics are hidden for this client (Censio admin only). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }
    return NextResponse.json({
      hiddenMetrics: parseHiddenMetrics(organization.dashboard_hidden_metrics),
      hideableMetrics: HIDEABLE_METRIC_IDS,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { hiddenMetrics?: unknown }

    if (
      !Array.isArray(body.hiddenMetrics) ||
      body.hiddenMetrics.some(
        (id) => typeof id !== "string" || !(HIDEABLE_METRIC_IDS as readonly string[]).includes(id)
      )
    ) {
      return NextResponse.json({ error: "invalid_hidden_metrics" }, { status: 400 })
    }

    const admin = createAdminClient()
    const existing = await getOrganizationBySlug(admin, slug)
    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const hiddenMetrics = parseHiddenMetrics(body.hiddenMetrics)
    const organization = await updateOrganizationBySlug(admin, slug, {
      dashboard_hidden_metrics: hiddenMetrics,
    })

    return NextResponse.json({
      hiddenMetrics: parseHiddenMetrics(organization.dashboard_hidden_metrics),
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
