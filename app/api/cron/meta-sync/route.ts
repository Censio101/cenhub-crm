import { NextResponse } from "next/server"

import { isCronAuthorized } from "@/lib/meta/cron-auth"
import { runMetaMetricsSyncBatch } from "@/lib/meta/run-meta-metrics-sync-batch"
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
    const source =
      request.headers.get("x-vercel-cron") === "1" ? "vercel-cron" : "cron"
    const { batchId, results, summary } = await runMetaMetricsSyncBatch(admin, {
      source,
    })

    return NextResponse.json({
      success: summary.failed === 0,
      batchId,
      synced: summary.synced,
      skipped: summary.skipped,
      failed: summary.failed,
      total: summary.total,
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
