import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  getMetaLeadsPreviewPage,
  META_INSTANT_LEADS_PAGE_SIZE,
  syncMetaLeadsPreviewCache,
} from "@/lib/meta/meta-instant-forms-service"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

function parsePageParams(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1)
  const pageSize = Math.min(
    META_INSTANT_LEADS_PAGE_SIZE,
    Math.max(
      1,
      Number(url.searchParams.get("pageSize") || String(META_INSTANT_LEADS_PAGE_SIZE)) ||
        META_INSTANT_LEADS_PAGE_SIZE
    )
  )
  return { page, pageSize }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const url = new URL(request.url)
    const { page, pageSize } = parsePageParams(url)

    const result = await getMetaLeadsPreviewPage(admin, organization.id, { page, pageSize })
    return NextResponse.json(result)
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as { daysBack?: number }
    const url = new URL(request.url)
    const { page, pageSize } = parsePageParams(url)
    const daysBack = Number(body.daysBack ?? url.searchParams.get("daysBack") ?? "90") || 90

    const synced = await syncMetaLeadsPreviewCache(admin, organization.id, { daysBack })
    if (synced.skipped) {
      return NextResponse.json({
        leads: [],
        total: 0,
        page: 1,
        pageSize,
        hasMore: false,
        syncedAt: null,
        daysBack,
        skipped: true,
        reason: synced.reason,
      })
    }

    const pageResult = await getMetaLeadsPreviewPage(admin, organization.id, { page, pageSize })
    return NextResponse.json({
      ...pageResult,
      added: synced.added,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
