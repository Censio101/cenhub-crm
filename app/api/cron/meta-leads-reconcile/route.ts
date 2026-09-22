import { NextResponse } from "next/server"

import { isCronAuthorized } from "@/lib/meta/cron-auth"
import { reconcileAllOrganizationLeads } from "@/lib/meta/reconcile-leads"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    )
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const results = await reconcileAllOrganizationLeads(admin, { daysBack: 30 })
    const imported = results.reduce((sum, row) => sum + (row.imported ?? 0), 0)

    return NextResponse.json({
      success: true,
      imported,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Meta lead reconcile failed.",
      },
      { status: 500 }
    )
  }
}

export const POST = GET
