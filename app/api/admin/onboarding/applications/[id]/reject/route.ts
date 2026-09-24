import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { markOnboardingApplicationRejected } from "@/lib/db/onboarding-applications-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { reason?: string }

    const admin = createAdminClient()
    const application = await markOnboardingApplicationRejected(
      admin,
      id,
      body.reason?.trim() ?? ""
    )

    return NextResponse.json({ application })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
