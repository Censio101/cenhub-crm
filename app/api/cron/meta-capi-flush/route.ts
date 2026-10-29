import { NextResponse } from "next/server"

import { isCronAuthorized } from "@/lib/meta/cron-auth"
import { flushPendingCapiEvents } from "@/lib/meta/capi-outbox"
import { createAdminClient } from "@/lib/supabase/admin"

/** Hourly: retry won-lead events for Meta that could not be delivered yet (until 7 days old). */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 })
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await flushPendingCapiEvents(createAdminClient())
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Meta conversions flush failed." },
      { status: 500 }
    )
  }
}

export const POST = GET
