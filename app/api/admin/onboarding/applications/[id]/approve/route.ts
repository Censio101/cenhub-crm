import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { parsePortalAccess } from "@/lib/auth/portal-access"
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
      metaAdAccountId?: string
      metaAccountName?: string
      access?: unknown
    }

    const parsedAccess = parsePortalAccess(body.access)
    if (!parsedAccess.ok) {
      return NextResponse.json({ error: parsedAccess.error }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await provisionClientFromApplication(admin, id, {
      slugOverride: body.slugOverride?.trim() || undefined,
      approvedByUserId: ctx.userId,
      access: parsedAccess.access,
    })

    const meta = await tryLinkMetaAfterProvision(admin, result.organization, {
      metaAdAccountId: body.metaAdAccountId,
      metaAccountName: body.metaAccountName,
    })

    return NextResponse.json({
      organization: result.organization,
      application: result.application,
      accessMethod: result.accessMethod,
      meta,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
