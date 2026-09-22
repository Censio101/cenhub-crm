import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { syncAllOrganizationAdMetrics } from "@/lib/meta/sync-ad-metrics"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const metricsResults = await syncAllOrganizationAdMetrics(admin, {
      source: "admin-sync-all",
    })

    return NextResponse.json({
      success: true,
      metricsResults,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
