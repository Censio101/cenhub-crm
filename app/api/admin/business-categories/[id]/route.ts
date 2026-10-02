import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  deleteBusinessCategory,
  renameBusinessCategory,
} from "@/lib/db/business-categories-repository"
import { normalizeBusinessCategoryName } from "@/lib/lead-sheet/business-category-label"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as { name?: string }
    const name = normalizeBusinessCategoryName(body.name ?? "")
    if (!name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const supabase = createAdminClient()
    const category = await renameBusinessCategory(supabase, id, name)
    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ category })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const supabase = createAdminClient()
    await deleteBusinessCategory(supabase, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
