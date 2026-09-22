import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import {
  createLead,
  listLeadsForOrganization,
  listMockLeads,
  usesDatabaseLeads,
} from "@/lib/db/leads-repository"
import type { Lead } from "@/lib/leads"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({ leads: listMockLeads(), source: "mock" })
    }

    const ctx = await getSessionContext()

    if (!ctx.organization?.id) {
      return NextResponse.json(
        { error: "Unauthorized — no organization context" },
        { status: 401 }
      )
    }

    const supabase =
      ctx.isDemoFallback && !ctx.userId
        ? createAdminClient()
        : await createClient()

    const leads = await listLeadsForOrganization(supabase, ctx.organization.id)

    return NextResponse.json({
      leads,
      source: "supabase",
      organization: {
        id: ctx.organization.id,
        slug: ctx.organization.slug,
        name: ctx.organization.name,
        demoMode: ctx.organization.demo_mode,
      },
    })
  } catch (error) {
    console.error("GET /api/leads failed:", error)
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lead: Lead }

    if (!usesDatabaseLeads()) {
      return NextResponse.json({
        lead: body.lead,
        source: "mock",
      })
    }

    const ctx = await getSessionContext()
    if (!ctx.organization?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase =
      ctx.isDemoFallback && !ctx.userId
        ? createAdminClient()
        : await createClient()

    const lead = await createLead(supabase, ctx.organization.id, body.lead)
    return NextResponse.json({ lead, source: "supabase" })
  } catch (error) {
    console.error("POST /api/leads failed:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
