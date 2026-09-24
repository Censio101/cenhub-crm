import { NextResponse } from "next/server"

import {
  getWorkspaceIntegrationsRow,
  loadWorkspaceIntegrations,
  saveWorkspaceIntegrations,
} from "@/lib/admin/workspace-integrations"
import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { validateNotifyEmailList } from "@/lib/onboarding/notify-emails"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PUT(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as { emails?: unknown }

    if (!Array.isArray(body.emails)) {
      return NextResponse.json({ error: "Expected emails array" }, { status: 400 })
    }

    const joined = body.emails
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ")

    const validated = validateNotifyEmailList(joined.length > 0 ? joined : null)
    if (!validated.ok) {
      return NextResponse.json(
        { error: `Invalid notification email: ${validated.invalid.join(", ")}` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const currentRow = await getWorkspaceIntegrationsRow(admin)
    const settings = await saveWorkspaceIntegrations(
      admin,
      { onboardingNotifyEmails: validated.normalized },
      currentRow
    )

    return NextResponse.json({
      onboardingNotifyEmails: settings.onboardingNotifyEmails,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const settings = await loadWorkspaceIntegrations(admin)
    return NextResponse.json({
      onboardingNotifyEmails: settings.onboardingNotifyEmails,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
