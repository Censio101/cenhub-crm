import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resolveMarketingAccessTokenForConfig } from "@/lib/meta/resolve-page-access-token"
import { fetchAdAccountPixels } from "@/lib/meta/pixels"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

/** Pixels available on this client's Meta ad account (for the Pixel dropdown). */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const row = await getMetaConfigRow(admin, organization.id)
    const adAccountId = row?.meta_ad_account_id?.trim() ?? ""
    if (!row || !adAccountId) {
      return NextResponse.json({ pixels: [], error: "no_ad_account" })
    }

    const token = resolveMarketingAccessTokenForConfig(row)
    if (!token) {
      return NextResponse.json({ pixels: [], error: "no_token" })
    }

    const refresh = new URL(request.url).searchParams.get("refresh") === "1"
    try {
      const pixels = await fetchAdAccountPixels(adAccountId, token, { bypassCache: refresh })
      return NextResponse.json({ pixels })
    } catch (metaError) {
      return NextResponse.json({
        pixels: [],
        error: "meta_error",
        message: metaError instanceof Error ? metaError.message : "Could not load pixels",
      })
    }
  } catch (error) {
    return adminErrorResponse(error)
  }
}
