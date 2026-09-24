import { createHash } from "node:crypto"

import { NextResponse } from "next/server"

import {
  createOnboardingApplication,
  hasPendingApplicationForEmail,
} from "@/lib/db/onboarding-applications-repository"
import { parseOnboardingApplicationBody } from "@/lib/onboarding/application-input"
import { onboardingErrorMessage } from "@/lib/onboarding/api-errors"
import {
  checkOnboardingRateLimit,
  hashRateLimitKey,
} from "@/lib/onboarding/rate-limit"
import { notifyAdminsOfNewOnboardingApplication } from "@/lib/onboarding/notify-new-application"
import { createAdminClient } from "@/lib/supabase/admin"

function clientIp(request: Request): string {
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
    const rateKey = hashRateLimitKey(ip, parsed.value.contactEmail)
    const rate = checkOnboardingRateLimit(rateKey)
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

    const admin = createAdminClient()
    if (await hasPendingApplicationForEmail(admin, parsed.value.contactEmail)) {
      return NextResponse.json(
        {
          error: onboardingErrorMessage("pending_application_exists"),
          code: "pending_application_exists",
        },
        { status: 409 }
      )
    }

    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32)
    const application = await createOnboardingApplication(admin, {
      ...parsed.value,
      source: "public_form",
      submitterIpHash: ipHash,
    })

    void notifyAdminsOfNewOnboardingApplication(admin, application).catch((notifyError) => {
      console.error("Onboarding admin notify failed:", notifyError)
    })

    return NextResponse.json(
      { id: application.id, status: application.status },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/onboarding/applications failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
