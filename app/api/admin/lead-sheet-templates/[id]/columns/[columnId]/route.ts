import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  recordLeadSheetChangeForTemplate,
  removeColumnFromTemplate,
  setTemplateColumnHidden,
  TemplateEditError,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string; columnId: string }> }

/** Per-template setting: hide the column from the client dashboard for everyone on it. */
export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id, columnId } = await context.params
    const body = (await request.json()) as { hiddenForClient?: boolean }
    if (typeof body.hiddenForClient !== "boolean") {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updated = await setTemplateColumnHidden(supabase, id, columnId, body.hiddenForClient)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof TemplateEditError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}

/** Takes the field out of this template only. The field stays in the library. */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id, columnId } = await context.params
    const supabase = createAdminClient()
    const updated = await removeColumnFromTemplate(supabase, id, columnId)
    await recordLeadSheetChangeForTemplate(supabase, id)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof TemplateEditError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
