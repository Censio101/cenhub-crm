import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import {
  deleteLeadById,
  listMockLeads,
  updateLeadById,
  usesDatabaseLeads,
} from "@/lib/db/leads-repository"
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
      return NextResponse.json({
        lead: listMockLeads().find((lead) => lead.id === id) ?? null,
        source: "mock",
      })
    }

    const session = await getSessionContext()
    if (!session.organization?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    const lead = await updateLeadById(
      supabase,
      session.organization.id,
      id,
      patch
    )

    return NextResponse.json({ lead, source: "supabase" })
  } catch (error) {
    console.error("PATCH /api/leads/[id] failed:", error)
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ ok: true, source: "mock" })
    }

    const session = await getSessionContext()
    if (!session.organization?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    await deleteLeadById(supabase, session.organization.id, id)
    return NextResponse.json({ ok: true, source: "supabase" })
  } catch (error) {
    console.error("DELETE /api/leads/[id] failed:", error)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
