import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import { deleteLeadById, updateLeadById, usesDatabaseLeads } from "@/lib/db/leads-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { stripHiddenCustomFields } from "@/lib/lead-sheet/client-visibility"
import { applyCustomFieldsToPatch } from "@/lib/lead-sheet/apply-custom-fields-patch"
import type { LeadRow } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const patch = (await request.json()) as LeadPatch

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const session = await requireOrganizationContext()

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    // Edits are checked against the visible columns: a client cannot change a hidden field.
    const { visible: leadSheet, hiddenCustomKeys } = await resolveClientDashboardSheet(
      supabase,
      session.organization.id
    )

    let safePatch = patch
    if (patch.customFields !== undefined) {
      const { data: row } = await supabase
        .from("leads")
        .select("custom_fields")
        .eq("id", id)
        .eq("organization_id", session.organization.id)
        .maybeSingle()

      const existing = (row as Pick<LeadRow, "custom_fields"> | null)?.custom_fields ?? {}
      const applied = applyCustomFieldsToPatch(patch, existing, leadSheet)
      if (applied.error) {
        return NextResponse.json({ error: applied.error }, { status: 400 })
      }
      safePatch = applied.patch
    }

    const lead = await updateLeadById(
      supabase,
      session.organization.id,
      id,
      safePatch
    )

    return NextResponse.json({
      lead: stripHiddenCustomFields(lead, hiddenCustomKeys),
      source: "supabase",
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("PATCH /api/leads/[id] failed:", error)
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const session = await requireOrganizationContext()

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    await deleteLeadById(supabase, session.organization.id, id)
    return NextResponse.json({ ok: true, source: "supabase" })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("DELETE /api/leads/[id] failed:", error)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
