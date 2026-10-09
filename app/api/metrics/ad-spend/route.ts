import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { listAdSpendByMonth } from "@/lib/db/ad-metrics-repository"
import { usesDatabaseLeads } from "@/lib/db/leads-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({
        adSpendByMonth: {},
        source: "pending",
      })
    }

    const ctx = await requireOrganizationContext()

    const supabase =
      ctx.isDemoFallback && !ctx.userId ? createAdminClient() : await createClient()

    const { adSpendByMonth, source } = await listAdSpendByMonth(
      supabase,
      ctx.organization.id
    )

    const payload = {
      adSpendByMonth,
      source,
      isAdminViewingClient: ctx.isAdminViewingClient,
    }
    return NextResponse.json(payload)
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("GET /api/metrics/ad-spend failed:", error)
    return NextResponse.json({ error: "Failed to load ad spend" }, { status: 500 })
  }
}
