import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  recordLeadSheetChangeForTemplate,
  removeColumnFromTemplate,
  setTemplateColumnHidden,
  setTemplateColumnServiceIdsEditor,
  TemplateEditError,
} from "@/lib/db/lead-sheet-repository"
import type { ServiceIdsEditor } from "@/lib/lead-sheet/types"
import { createAdminClient } from "@/lib/supabase/admin"

function isServiceIdsEditor(value: unknown): value is ServiceIdsEditor {
  return value === "picker" || value === "text"
}

type Ctx = { params: Promise<{ id: string; columnId: string }> }

/** Per-template setting: hide the column from the client dashboard for everyone on it. */
export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id, columnId } = await context.params
    const body = (await request.json()) as {
      hiddenForClient?: boolean
      serviceIdsEditor?: unknown
    }

    const supabase = createAdminClient()
    if (typeof body.hiddenForClient === "boolean") {
      const updated = await setTemplateColumnHidden(supabase, id, columnId, body.hiddenForClient)
      return NextResponse.json(updated)
    }
    if (isServiceIdsEditor(body.serviceIdsEditor)) {
      const updated = await setTemplateColumnServiceIdsEditor(
        supabase,
        id,
        columnId,
        body.serviceIdsEditor
      )
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
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
