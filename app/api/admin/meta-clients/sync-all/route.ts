import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { runMetaMetricsSyncBatch } from "@/lib/meta/run-meta-metrics-sync-batch"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const { batchId, results, summary } = await runMetaMetricsSyncBatch(admin, {
      source: "admin-sync-all",
    })

    return NextResponse.json({
      success: summary.failed === 0,
      batchId,
      summary,
      metricsResults: results,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
