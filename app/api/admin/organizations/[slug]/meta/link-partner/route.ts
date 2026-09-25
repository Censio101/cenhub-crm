import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { deriveMetaClientStatus } from "@/lib/db/meta-clients-repository"
import {
  linkPartnerAdAccountToOrganization,
  MetaPartnerLinkConflictError,
} from "@/lib/meta/link-partner-to-organization"
import { clearPartnerAdAccountsCache } from "@/lib/meta/ad-accounts"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      metaAdAccountId?: string
      accountName?: string
    }

    if (!body.metaAdAccountId?.trim()) {
      return NextResponse.json({ error: "metaAdAccountId is required" }, { status: 400 })
    }
    if (!body.accountName?.trim()) {
      return NextResponse.json({ error: "accountName is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await linkPartnerAdAccountToOrganization(admin, {
      slug,
      metaAdAccountId: body.metaAdAccountId,
      accountName: body.accountName,
    })

    const row = await getMetaConfigRow(admin, result.organization.id)
    const derived = deriveMetaClientStatus({
      enabled: Boolean(row?.enabled),
      metaAdAccountId: row?.meta_ad_account_id ?? result.metaAdAccountId,
      metaPageId: row?.meta_page_id ?? "",
      metaSyncStatus: row?.meta_sync_status ?? "",
    })

    clearPartnerAdAccountsCache()

    return NextResponse.json({
      ...result,
      meta: {
        metaAdAccountId: row?.meta_ad_account_id ?? result.metaAdAccountId,
        metaPageId: row?.meta_page_id ?? "",
        enabled: Boolean(row?.enabled),
        needsSetup: derived.needsSetup,
        metaSyncStatus: row?.meta_sync_status ?? "",
        metaSyncError: row?.meta_sync_error ?? null,
      },
    })
  } catch (error) {
    if (error instanceof MetaPartnerLinkConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          linkedSlug: error.linkedSlug,
          linkedOrgName: error.linkedOrgName,
        },
        { status: 409 }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
