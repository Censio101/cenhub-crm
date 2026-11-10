import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  LEAD_NOTIFY_DELIVERY_PAGE_SIZE,
  listRecentLeadNotifyDeliveries,
} from "@/lib/db/lead-notify-deliveries-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

function readPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
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
    const page = readPositiveInt(url.searchParams.get("page"), 1)
    const pageSize = readPositiveInt(
      url.searchParams.get("pageSize"),
      LEAD_NOTIFY_DELIVERY_PAGE_SIZE
    )

    const result = await listRecentLeadNotifyDeliveries(admin, organization.id, { page, pageSize })
    return NextResponse.json(result)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
