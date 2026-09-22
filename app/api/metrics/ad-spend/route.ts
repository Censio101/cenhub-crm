import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import {
  listAdSpendByMonth,
  listDemoAdSpendByMonth,
} from "@/lib/db/ad-metrics-repository"
import { usesDatabaseLeads } from "@/lib/db/leads-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    if (!usesDatabaseLeads()) {
      return NextResponse.json({
        adSpendByMonth: listDemoAdSpendByMonth(),
        source: "demo",
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

    const adSpendByMonth = await listAdSpendByMonth(supabase, ctx.organization.id)

    return NextResponse.json({
      adSpendByMonth,
      source: "supabase",
    })
  } catch (error) {
    console.error("GET /api/metrics/ad-spend failed:", error)
    return NextResponse.json({ error: "Failed to load ad spend" }, { status: 500 })
  }
}
