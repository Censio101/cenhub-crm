import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { resendCensioAdminInvite } from "@/lib/db/admin-users"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const admin = createAdminClient()
    await resendCensioAdminInvite(admin, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
