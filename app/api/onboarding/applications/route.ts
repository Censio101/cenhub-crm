import { createHash } from "node:crypto"

import { NextResponse } from "next/server"

import {
  createOnboardingApplication,
  hasPendingApplicationForEmail,
} from "@/lib/db/onboarding-applications-repository"
import { parseOnboardingApplicationBody } from "@/lib/onboarding/application-input"
import { onboardingErrorMessage } from "@/lib/onboarding/api-errors"
import { checkOnboardingRateLimit } from "@/lib/onboarding/rate-limit"
import { notifyApplicantOfOnboardingSubmission } from "@/lib/onboarding/notify-applicant-submission"
import { notifyAdminsOfNewOnboardingApplication } from "@/lib/onboarding/notify-new-application"
import { createAdminClient } from "@/lib/supabase/admin"

function clientIp(request: Request): string {
  // On Vercel these headers are set by the platform from the real connection, not by the sender.
  const vercel = request.headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.split(",")[0]?.trim() ?? "unknown"
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = parseOnboardingApplicationBody(body, { requireConsent: true })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: onboardingErrorMessage(parsed.error), code: parsed.error },
        { status: 400 }
      )
    }

    const ip = clientIp(request)
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32)
    const admin = createAdminClient()

    // Counted in the database, per IP (changing the email does not help) and overall.
    const rate = await checkOnboardingRateLimit(admin, ipHash)
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: onboardingErrorMessage("rate_limited"),
          code: "rate_limited",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    if (await hasPendingApplicationForEmail(admin, parsed.value.contactEmail)) {
      return NextResponse.json(
        {
          error: onboardingErrorMessage("pending_application_exists"),
          code: "pending_application_exists",
        },
        { status: 409 }
      )
    }

    const application = await createOnboardingApplication(admin, {
      ...parsed.value,
      source: "public_form",
      submitterIpHash: ipHash,
    })

    void notifyAdminsOfNewOnboardingApplication(admin, application).catch((notifyError) => {
      console.error("Onboarding admin notify failed:", notifyError)
    })

    void notifyApplicantOfOnboardingSubmission(admin, application).catch(
      (notifyError) => {
        console.error("Onboarding applicant confirmation email failed:", notifyError)
      }
    )

    return NextResponse.json(
      { id: application.id, status: application.status },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/onboarding/applications failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
