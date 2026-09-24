import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  countOnboardingApplicationsByStatus,
  createOnboardingApplication,
  listOnboardingApplications,
} from "@/lib/db/onboarding-applications-repository"
import { parseOnboardingApplicationBody } from "@/lib/onboarding/application-input"
import { onboardingErrorMessage } from "@/lib/onboarding/api-errors"
import { tryLinkMetaAfterProvision } from "@/lib/onboarding/link-meta-after-provision"
import { provisionClientFromApplication } from "@/lib/onboarding/provision-client"
import type { OnboardingApplicationStatus } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")
    const status =
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "rejected"
        ? (statusParam as OnboardingApplicationStatus)
        : undefined

    const admin = createAdminClient()
    const [applications, counts] = await Promise.all([
      listOnboardingApplications(admin, status),
      countOnboardingApplicationsByStatus(admin),
    ])
    return NextResponse.json({ applications, counts })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCensioAdmin()
    const body = (await request.json()) as Record<string, unknown>
    const parsed = parseOnboardingApplicationBody(body, { requireConsent: false })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: onboardingErrorMessage(parsed.error), code: parsed.error },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const application = await createOnboardingApplication(admin, {
      ...parsed.value,
      source: "admin_manual",
      consentGiven: true,
    })

    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const autoApprove = Boolean(body.autoApprove)
    if (!autoApprove) {
      return NextResponse.json({ application }, { status: 201 })
    }

    const slugOverride =
      typeof body.slugOverride === "string" ? body.slugOverride.trim() : undefined
    const seedDemo = Boolean(body.seedDemo)
    const demoMode = Boolean(body.demoMode)

    const result = await provisionClientFromApplication(admin, application.id, {
      slugOverride,
      seedDemo,
      demoMode,
      approvedByUserId: ctx.userId,
    })

    const metaAdAccountId =
      typeof body.metaAdAccountId === "string" ? body.metaAdAccountId.trim() : undefined
    const metaAccountName =
      typeof body.metaAccountName === "string" ? body.metaAccountName.trim() : undefined

    const meta = await tryLinkMetaAfterProvision(admin, result.organization, {
      metaAdAccountId,
      metaAccountName,
    })

    return NextResponse.json(
      {
        application: result.application,
        organization: result.organization,
        inviteSent: result.inviteSent,
        demoSeed: result.demoSeed ?? null,
        meta,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
