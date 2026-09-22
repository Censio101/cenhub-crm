import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import {
  listCustomersForOrganization,
  listMockCustomers,
} from "@/lib/db/customers-repository"
import { usesDatabaseLeads } from "@/lib/db/leads-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({ customers: listMockCustomers(), source: "mock" })
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

    const customers = await listCustomersForOrganization(
      supabase,
      ctx.organization.id
    )

    return NextResponse.json({
      customers,
      source: "supabase",
      organization: {
        id: ctx.organization.id,
        slug: ctx.organization.slug,
        name: ctx.organization.name,
        demoMode: ctx.organization.demo_mode,
      },
    })
  } catch (error) {
    console.error("GET /api/customers failed:", error)
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 })
  }
}
