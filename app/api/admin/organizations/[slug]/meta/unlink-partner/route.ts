import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { unlinkPartnerAdAccountFromOrganization } from "@/lib/meta/unlink-partner-from-organization"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const result = await unlinkPartnerAdAccountFromOrganization(admin, slug)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
