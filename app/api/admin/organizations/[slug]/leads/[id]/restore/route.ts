import { NextResponse } from "next/server"

import { requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { restoreLeadById, usesDatabaseLeads } from "@/lib/db/leads-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string; id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, id } = await context.params

    if (!usesDatabaseLeads()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const org = await getOrganizationBySlug(slug)
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const lead = await restoreLeadById(admin, org.id, id, {
      source: "api",
      actorRole: "censio_admin",
    })

    return NextResponse.json({ ok: true, lead })
  } catch (error) {
    console.error("POST restore lead failed:", error)
    const message = error instanceof Error ? error.message : "Failed to restore lead"
    const status = message === "Lead not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
