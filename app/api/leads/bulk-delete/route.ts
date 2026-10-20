import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { deleteLeadsByIds, usesDatabaseLeads } from "@/lib/db/leads-repository"
import { parseUuidList } from "@/lib/services/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = (await request.json()) as unknown
    const ids =
      body && typeof body === "object" && "ids" in body
        ? parseUuidList((body as { ids: unknown }).ids, 500)
        : null

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "Invalid lead ids" }, { status: 400 })
    }

    const session = await requireOrganizationContext()

    if (session.role !== "censio_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase =
      session.isDemoFallback && !session.userId
        ? createAdminClient()
        : await createClient()

    const deleted = await deleteLeadsByIds(supabase, session.organization.id, ids)
    return NextResponse.json({ ok: true, deleted, source: "supabase" })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("POST /api/leads/bulk-delete failed:", error)
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 })
  }
}
