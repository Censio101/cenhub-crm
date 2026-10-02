import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { deleteBusinessSubcategory } from "@/lib/db/business-categories-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const supabase = createAdminClient()
    await deleteBusinessSubcategory(supabase, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
