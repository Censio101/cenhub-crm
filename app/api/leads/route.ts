import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import {
  createLead,
  listLeadsForOrganization,
  usesDatabaseLeads,
} from "@/lib/db/leads-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { stripHiddenCustomFields } from "@/lib/lead-sheet/client-visibility"
import { sanitizeNewLeadCustomFields } from "@/lib/lead-sheet/apply-custom-fields-patch"
import type { Lead } from "@/lib/leads"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const ctx = await requireOrganizationContext()

    const supabase =
      ctx.isDemoFallback && !ctx.userId
        ? createAdminClient()
        : await createClient()

    const [allLeads, { hiddenCustomKeys }] = await Promise.all([
      listLeadsForOrganization(supabase, ctx.organization.id),
      resolveClientDashboardSheet(supabase, ctx.organization.id),
    ])
    // Values of hidden custom columns never leave the server.
    const leads = allLeads.map((lead) => stripHiddenCustomFields(lead, hiddenCustomKeys))

    return NextResponse.json({
      leads,
      source: "supabase",
      organization: {
        id: ctx.organization.id,
        slug: ctx.organization.slug,
        name: ctx.organization.name,
        demoMode: ctx.organization.demo_mode,
      },
      isAdminViewingClient: ctx.isAdminViewingClient,
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("GET /api/leads failed:", error)
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lead: Lead }

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const ctx = await requireOrganizationContext()

    const supabase =
      ctx.isDemoFallback && !ctx.userId
        ? createAdminClient()
        : await createClient()

    // Validate against what the client can see: hidden required columns must not block them.
    const { visible: leadSheet, hiddenCustomKeys } = await resolveClientDashboardSheet(
      supabase,
      ctx.organization.id
    )
    const normalized = sanitizeNewLeadCustomFields(body.lead.customFields, leadSheet)
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const lead = await createLead(supabase, ctx.organization.id, {
      ...body.lead,
      customFields: normalized.customFields,
    })
    return NextResponse.json({
      lead: stripHiddenCustomFields(lead, hiddenCustomKeys),
      source: "supabase",
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("POST /api/leads failed:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
