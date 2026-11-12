import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { canDeleteLeads } from "@/lib/auth/permissions"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import { deleteLeadById, updateLeadById, usesDatabaseLeads } from "@/lib/db/leads-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { stripHiddenCustomFields } from "@/lib/lead-sheet/client-visibility"
import { applyCustomFieldsToPatch } from "@/lib/lead-sheet/apply-custom-fields-patch"
import { getOrganizationServiceAliasMap } from "@/lib/db/service-aliases-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { applyLeadServicePatch } from "@/lib/leads/apply-lead-service-patch"
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
    // The step count of a stepped form is owned by the funnel webhook, never by an edit.
    delete patch.formStepsDone

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

    const admin = createAdminClient()
    const [services, serviceAliasMap] = await Promise.all([
      resolveOrganizationServices(admin, session.organization.id),
      getOrganizationServiceAliasMap(admin, session.organization.id),
    ])

    let safePatch = applyLeadServicePatch(patch, leadSheet, services, serviceAliasMap)
    if (patch.customFields !== undefined) {
      const { data: row } = await supabase
        .from("leads")
        .select("custom_fields")
        .eq("id", id)
        .eq("organization_id", session.organization.id)
        .maybeSingle()

      const existing = (row as Pick<LeadRow, "custom_fields"> | null)?.custom_fields ?? {}
      const applied = applyCustomFieldsToPatch(safePatch, existing, leadSheet)
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

    // Only a client admin (or a Censio admin) may delete; a client user can only see and fill in.
    if (!session.isDemoFallback && !canDeleteLeads(session.role)) {
      return NextResponse.json(
        { error: "forbidden", message: "Only a client admin can delete leads." },
        { status: 403 }
      )
    }

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    await deleteLeadById(supabase, session.organization.id, id, {
      actorUserId: session.userId,
      actorRole: session.role,
      source: "api",
    })
    return NextResponse.json({ ok: true, source: "supabase" })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    if (error instanceof Error) {
      if (error.message === "forbidden" || error.message.includes("forbidden")) {
        return NextResponse.json(
          { error: "forbidden", message: "You are not allowed to delete this lead." },
          { status: 403 }
        )
      }
      if (error.message === "Lead not found" || error.message.includes("not found")) {
        return NextResponse.json({ error: "not_found", message: "Lead not found." }, { status: 404 })
      }
      if (
        error.message.includes("soft_delete_lead") ||
        error.message.includes("Could not find the function")
      ) {
        console.error("DELETE /api/leads/[id]: soft_delete_lead missing — run DB migrations 074–076")
      }
    }
    console.error("DELETE /api/leads/[id] failed:", error)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
