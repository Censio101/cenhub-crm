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
import { isLeadStatusId, type Lead } from "@/lib/leads"
import { isOnboardingContactEmailValid } from "@/lib/onboarding/application-input"
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
    const body = (await request.json().catch(() => null)) as { lead?: Lead } | null

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const input = body?.lead
    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Missing lead" }, { status: 400 })
    }
    // A hand-added lead needs a name and a way to reach the person.
    const textOf = (value: unknown) => (typeof value === "string" ? value.trim() : "")
    if (!textOf(input.fullName)) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }
    if (!isOnboardingContactEmailValid(textOf(input.email))) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }
    if (!textOf(input.phone)) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
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
    const normalized = sanitizeNewLeadCustomFields(input.customFields, leadSheet)
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const lead = await createLead(supabase, ctx.organization.id, {
      ...input,
      // Hand-added leads are always "manual" and never carry Meta's locked fields.
      source: "manual",
      lockedFields: [],
      status: isLeadStatusId(input.status) ? input.status : "new_waiting_call",
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
