import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  addFieldToTemplate,
  recordLeadSheetChangeForTemplate,
  reorderTemplateColumns,
  TemplateEditError,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as { orderedColumnIds?: string[] }

    if (!body.orderedColumnIds?.length) {
      return NextResponse.json({ error: "orderedColumnIds required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updated = await reorderTemplateColumns(supabase, id, body.orderedColumnIds)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes("built-in")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}

/** Adds an existing library field to the template. Templates never create fields. */
export async function POST(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as {
      afterColumnId?: string | null
      builtinKey?: string
      customFieldId?: string
    }

    const field = body.builtinKey?.trim()
      ? { builtinKey: body.builtinKey.trim() }
      : body.customFieldId?.trim()
        ? { customFieldId: body.customFieldId.trim() }
        : null
    if (!field) {
      return NextResponse.json({ error: "Choose a field" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updated = await addFieldToTemplate(supabase, id, field, body.afterColumnId ?? null)
    await recordLeadSheetChangeForTemplate(supabase, id)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof TemplateEditError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
