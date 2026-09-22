import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOrganizationBySlug,
  listOrganizationsWithStats,
  updateOrganizationBySlug,
} from "@/lib/db/organizations-repository"
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

    const summaries = await listOrganizationsWithStats(admin)
    const summary = summaries.find((item) => item.slug === slug)

    return NextResponse.json({
      organization: summary ?? {
        ...organization,
        leadCount: 0,
        userCount: 0,
        metaEnabled: false,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      name?: string
      demoMode?: boolean
    }

    const admin = createAdminClient()
    const organization = await updateOrganizationBySlug(admin, slug, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.demoMode !== undefined ? { demo_mode: body.demoMode } : {}),
    })

    return NextResponse.json({ organization })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
