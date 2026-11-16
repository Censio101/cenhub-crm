import { NextResponse } from "next/server"

import {
  consumeBulkListRateLimit,
  type BulkListRoute,
} from "@/lib/security/bulk-list-rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Returns a 429 response when limited, otherwise null (caller may proceed).
 * On logging DB errors, fails open so a migration gap does not break dashboards.
 */
export async function enforceBulkListRateLimit(input: {
  organizationId: string
  userId: string
  route: BulkListRoute
}): Promise<NextResponse | null> {
  if (process.env.BULK_LIST_RATE_LIMIT_DISABLED === "1") {
    return null
  }
  try {
    const admin = createAdminClient()
    const decision = await consumeBulkListRateLimit(admin, input)
    if (!decision.allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(decision.retryAfterSeconds) },
        }
      )
    }
    return null
  } catch (error) {
    console.error(`bulk list rate limit (${input.route}) skipped due to error:`, error)
    return null
  }
}