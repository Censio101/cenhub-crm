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
    // #region agent log
    fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "138f58",
      },
      body: JSON.stringify({
        sessionId: "138f58",
        hypothesisId: "A",
        location: "ad-spend/route.ts:GET",
        message: "ad spend api response",
        data: {
          orgId: ctx.organization.id,
          orgSlug: ctx.organization.slug,
          source,
          monthKeys: Object.keys(adSpendByMonth),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return NextResponse.json(payload)
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    console.error("GET /api/metrics/ad-spend failed:", error)
    return NextResponse.json({ error: "Failed to load ad spend" }, { status: 500 })
  }
}
