import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  ColumnSettingsError,
  createLibraryField,
  listLibraryFields,
} from "@/lib/db/lead-sheet-repository"
import { FieldKeyError } from "@/lib/lead-sheet/field-key"
import { isCustomFieldType } from "@/lib/lead-sheet/types"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const fields = await listLibraryFields(createAdminClient())
    return NextResponse.json({ fields })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      label?: string
      fieldType?: string
      config?: Record<string, unknown>
      fieldKey?: string
    }

    if (!body.label?.trim() || !body.fieldType || !isCustomFieldType(body.fieldType)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 })
    }

    const field = await createLibraryField(createAdminClient(), {
      label: body.label,
      fieldType: body.fieldType,
      config: body.config,
      fieldKey: body.fieldKey,
    })
    return NextResponse.json({ field })
  } catch (error) {
    if (error instanceof FieldKeyError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code === "taken" ? "field_key_taken" : "field_key_invalid",
        },
        { status: error.code === "taken" ? 409 : 400 }
      )
    }
    if (error instanceof ColumnSettingsError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
