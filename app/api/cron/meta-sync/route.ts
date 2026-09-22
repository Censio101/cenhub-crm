import { NextResponse } from "next/server"

import { isCronAuthorized } from "@/lib/meta/cron-auth"
import { syncAllOrganizationAdMetrics } from "@/lib/meta/sync-ad-metrics"
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
    const results = await syncAllOrganizationAdMetrics(admin, {
      source: request.headers.get("x-vercel-cron") === "1" ? "vercel-cron" : "cron",
    })

    const synced = results.filter((row) => row.success).length
    const skipped = results.filter((row) => row.skipped).length
    const failed = results.filter((row) => !row.success && !row.skipped).length

    return NextResponse.json({
      success: failed === 0,
      synced,
      skipped,
      failed,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Meta cron sync failed.",
      },
      { status: 500 }
    )
  }
}

export const POST = GET
