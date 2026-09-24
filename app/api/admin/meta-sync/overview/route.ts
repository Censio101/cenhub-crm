import { NextResponse } from "next/server"

import { buildMetaSyncOverview } from "@/lib/admin/meta-sync-overview"
import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { listMetaSyncRunsForBatch } from "@/lib/db/meta-sync-runs-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")

    const admin = createAdminClient()
    const overview = await buildMetaSyncOverview(admin)

    if (batchId) {
      const runs = await listMetaSyncRunsForBatch(admin, batchId)
      return NextResponse.json({ ...overview, batchRuns: runs })
    }

    return NextResponse.json(overview)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
