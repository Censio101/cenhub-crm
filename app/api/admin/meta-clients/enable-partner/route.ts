import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { enablePartnerMetaAccount } from "@/lib/db/meta-clients-repository"
import { onboardMetaClient } from "@/lib/meta/onboard-meta-client"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      metaAdAccountId?: string
      accountName?: string
      enabled?: boolean
      slug?: string
    }

    if (!body.metaAdAccountId?.trim()) {
      return NextResponse.json({ error: "metaAdAccountId is required" }, { status: 400 })
    }

    if (!body.accountName?.trim()) {
      return NextResponse.json({ error: "accountName is required" }, { status: 400 })
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await enablePartnerMetaAccount(admin, {
      metaAdAccountId: body.metaAdAccountId,
      accountName: body.accountName,
      enabled: body.enabled,
      slug: body.slug,
    })

    const onboard =
      body.enabled
        ? await onboardMetaClient(admin, result.organization.id, {
            source: "admin-enable-partner",
          })
        : null

    return NextResponse.json({
      ...result,
      onboard,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("slug")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
