import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { listRecentMetaSyncRuns } from "@/lib/db/meta-sync-runs-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const slug = searchParams.get("slug")
    const limitRaw = searchParams.get("limit")
    const limit = Math.min(Math.max(Number(limitRaw) || 10, 1), 50)

    const admin = createAdminClient()
    let orgId = organizationId

    if (!orgId && slug) {
      const org = await getOrganizationBySlug(admin, slug)
      if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 })
      }
      orgId = org.id
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "organizationId or slug is required." },
        { status: 400 }
      )
    }

    const runs = await listRecentMetaSyncRuns(admin, orgId, limit)
    return NextResponse.json({ organizationId: orgId, runs })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
