import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { removeCensioAdmin } from "@/lib/db/admin-users"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const ctx = await requireCensioAdmin()
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const admin = createAdminClient()
    await removeCensioAdmin(admin, id, ctx.userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
