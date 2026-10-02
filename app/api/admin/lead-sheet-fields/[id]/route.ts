import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  ColumnSettingsError,
  deleteLibraryField,
  recordLeadSheetChangeForOrganizations,
  updateLibraryField,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as {
      label?: string
      options?: string[]
    }
    if (body.label === undefined && body.options === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }
    if (body.options !== undefined && !Array.isArray(body.options)) {
      return NextResponse.json({ error: "options must be a list" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { field, affectedOrganizationIds } = await updateLibraryField(supabase, id, body)
    // Options change what senders may send, so clients get a review reminder.
    if (body.options !== undefined) {
      await recordLeadSheetChangeForOrganizations(supabase, affectedOrganizationIds)
    }
    return NextResponse.json({ field })
  } catch (error) {
    if (error instanceof ColumnSettingsError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}

/** Deletes a custom field everywhere. Built-in fields are not in this table, so they cannot go. */
export async function DELETE(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const supabase = createAdminClient()
    const purgeData = new URL(request.url).searchParams.get("purgeData") === "1"
    const result = await deleteLibraryField(supabase, id, { purgeData })
    await recordLeadSheetChangeForOrganizations(supabase, result.affectedOrganizationIds)
    return NextResponse.json({ ok: true, purgedLeads: result.purgedLeads })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
