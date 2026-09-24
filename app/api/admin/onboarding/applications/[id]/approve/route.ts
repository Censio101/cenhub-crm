import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { tryLinkMetaAfterProvision } from "@/lib/onboarding/link-meta-after-provision"
import { provisionClientFromApplication } from "@/lib/onboarding/provision-client"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const ctx = await requireCensioAdmin()
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      slugOverride?: string
      seedDemo?: boolean
      demoMode?: boolean
      metaAdAccountId?: string
      metaAccountName?: string
    }

    const admin = createAdminClient()
    const result = await provisionClientFromApplication(admin, id, {
      slugOverride: body.slugOverride?.trim() || undefined,
      seedDemo: Boolean(body.seedDemo),
      demoMode: Boolean(body.demoMode),
      approvedByUserId: ctx.userId,
    })

    const meta = await tryLinkMetaAfterProvision(admin, result.organization, {
      metaAdAccountId: body.metaAdAccountId,
      metaAccountName: body.metaAccountName,
    })

    return NextResponse.json({
      organization: result.organization,
      application: result.application,
      inviteSent: result.inviteSent,
      demoSeed: result.demoSeed ?? null,
      meta,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
