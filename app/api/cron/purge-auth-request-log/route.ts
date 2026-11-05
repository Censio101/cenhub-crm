import { NextResponse } from "next/server"

import { isCronAuthorized } from "@/lib/meta/cron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 })
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc("purge_auth_request_log", { retention_days: 30 })
    if (error) throw error
    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    console.error("purge-auth-request-log cron failed:", error)
    return NextResponse.json({ error: "Purge failed" }, { status: 500 })
  }
}
