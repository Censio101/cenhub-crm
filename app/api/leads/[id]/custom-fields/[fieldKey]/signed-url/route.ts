import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import type { LeadRow } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type Ctx = { params: Promise<{ id: string; fieldKey: string }> }

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id: leadId, fieldKey } = await context.params
    const ctx = await requireOrganizationContext()
    const supabase =
      ctx.isDemoFallback && !ctx.userId ? createAdminClient() : await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from("leads")
      .select("custom_fields")
      .eq("id", leadId)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const path = (existing as Pick<LeadRow, "custom_fields">).custom_fields?.[fieldKey]
    if (typeof path !== "string" || !path) {
      return NextResponse.json({ url: null })
    }

    const { data, error } = await supabase.storage
      .from("lead-sheet-files")
      .createSignedUrl(path, 3600)

    if (error) throw error
    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 })
  }
}
