import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getOnboardingApplicationById,
  hasPendingApplicationForEmail,
  markOnboardingApplicationReopened,
} from "@/lib/db/onboarding-applications-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params

    const admin = createAdminClient()
    const existing = await getOnboardingApplicationById(admin, id)
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }
    if (existing.status !== "rejected") {
      return NextResponse.json(
        { error: "Only rejected applications can be moved back to pending" },
        { status: 400 }
      )
    }
    if (await hasPendingApplicationForEmail(admin, existing.contact_email)) {
      return NextResponse.json(
        { error: "An application with this email is already pending" },
        { status: 400 }
      )
    }

    const application = await markOnboardingApplicationReopened(admin, id)

    return NextResponse.json({ application })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
