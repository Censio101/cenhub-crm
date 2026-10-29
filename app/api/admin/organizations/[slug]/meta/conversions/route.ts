import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { getCapiOverview, sendCapiTestEvent } from "@/lib/meta/capi-outbox"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

async function loadOrganization(slug: string) {
  const admin = createAdminClient()
  const organization = await getOrganizationBySlug(admin, slug)
  return { admin, organization }
}

/** Switch state, chosen pixel and the latest events sent to Meta for this client. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const { admin, organization } = await loadOrganization(slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const row = await getMetaConfigRow(admin, organization.id)
    const overview = await getCapiOverview(admin, organization.id)
    return NextResponse.json({
      enabled: Boolean(row?.capi_enabled),
      pixelId: row?.meta_pixel_id?.trim() ?? "",
      ...overview,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** Turn "send won leads to Meta" on or off. Needs a pixel to be chosen first. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 })
    }

    const { admin, organization } = await loadOrganization(slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const row = await getMetaConfigRow(admin, organization.id)
    if (!row) {
      return NextResponse.json({ error: "meta_not_configured" }, { status: 400 })
    }
    if (body.enabled && !row.meta_pixel_id?.trim()) {
      return NextResponse.json({ error: "pixel_required" }, { status: 400 })
    }

    const { error } = await admin
      .from("client_meta_config")
      .update({ capi_enabled: body.enabled })
      .eq("organization_id", organization.id)
    if (error) throw error

    return NextResponse.json({ enabled: body.enabled })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** Send one test event to Events Manager > Test events (needs the test code shown there). */
export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json().catch(() => null)) as { testEventCode?: unknown } | null
    const testEventCode = typeof body?.testEventCode === "string" ? body.testEventCode.trim() : ""
    if (!testEventCode) {
      return NextResponse.json({ error: "test_code_required" }, { status: 400 })
    }

    const { admin, organization } = await loadOrganization(slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const result = await sendCapiTestEvent(admin, organization.id, testEventCode)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
