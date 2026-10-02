import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { duplicateLeadSheetTemplate } from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as {
      name?: string
      organizationId?: string | null
      isShared?: boolean
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const created = await duplicateLeadSheetTemplate(supabase, id, {
      name: body.name.trim(),
      organizationId: body.organizationId,
      isShared: body.isShared,
    })
    return NextResponse.json(created)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
