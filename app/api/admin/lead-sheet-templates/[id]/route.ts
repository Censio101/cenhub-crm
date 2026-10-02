import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  getLeadSheetTemplateById,
  listClientsUsingTemplate,
  setTemplateCategoryIds,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const supabase = createAdminClient()
    const [template, clients] = await Promise.all([
      getLeadSheetTemplateById(supabase, id),
      listClientsUsingTemplate(supabase, id),
    ])
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    // `usage` lists the clients whose sheet (and webhook payload) this template drives.
    return NextResponse.json({ ...template, usage: { clients } })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as {
      name?: string
      description?: string
      isShared?: boolean
      categoryIds?: string[]
      subcategoryIds?: string[]
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.isShared !== undefined) updates.is_shared = body.isShared

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("lead_sheet_templates").update(updates).eq("id", id)
      if (error) throw error
    }

    if (body.categoryIds !== undefined) {
      await setTemplateCategoryIds(supabase, id, body.categoryIds)
    }

    if (body.subcategoryIds !== undefined) {
      await supabase.from("lead_sheet_template_subcategories").delete().eq("template_id", id)
      if (body.subcategoryIds.length > 0) {
        const { error } = await supabase.from("lead_sheet_template_subcategories").insert(
          body.subcategoryIds.map((subcategory_id) => ({
            template_id: id,
            subcategory_id,
          }))
        )
        if (error) throw error
      }
    }

    const template = await getLeadSheetTemplateById(supabase, id)
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(template)
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: row } = await supabase
      .from("lead_sheet_templates")
      .select("is_system_default")
      .eq("id", id)
      .maybeSingle()

    if (row?.is_system_default) {
      return NextResponse.json({ error: "Cannot delete default template" }, { status: 400 })
    }

    const { error } = await supabase.from("lead_sheet_templates").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
