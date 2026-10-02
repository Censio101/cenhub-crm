import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { leadRowToLead } from "@/lib/db/lead-mapper"
import {
  listCustomFieldDefs,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import type { LeadRow } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MAX_BYTES = 5 * 1024 * 1024

type Ctx = { params: Promise<{ id: string; fieldKey: string }> }

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: leadId, fieldKey } = await context.params
    const ctx = await requireOrganizationContext()
    const supabase =
      ctx.isDemoFallback && !ctx.userId ? createAdminClient() : await createClient()

    const leadSheet = await resolveLeadSheetForOrganization(supabase, ctx.organization.id)
    const fieldDef = listCustomFieldDefs(leadSheet ?? { template: {} as never, columns: [] }).find(
      (f) => f.fieldKey === fieldKey
    )

    if (!fieldDef || fieldDef.fieldType !== "image") {
      return NextResponse.json({ error: "Invalid image field" }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${ctx.organization.id}/${leadId}/${fieldKey}/${randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from("lead-sheet-files")
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error(uploadError)
      return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const row = existing as LeadRow
    const customFields = { ...(row.custom_fields ?? {}), [fieldKey]: path }

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({ custom_fields: customFields })
      .eq("id", leadId)
      .eq("organization_id", ctx.organization.id)
      .select("*")
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ lead: leadRowToLead(updated as LeadRow), path })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("Lead image upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
