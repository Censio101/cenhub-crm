import { NextResponse } from "next/server"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { sendMailWithIntegrations } from "@/lib/email/mailgun"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const settings = await loadWorkspaceIntegrations(admin)

    if (!settings.mailConfigured) {
      return NextResponse.json(
        { error: "Mailgun is not configured yet" },
        { status: 400 }
      )
    }

    await sendMailWithIntegrations(settings, {
      to: email,
      subject: "Censio CRM – test e-mail",
      html: `<p>Hej,</p><p>Dette er en test e-mail fra Censio CRM via Mailgun.</p><p>— Censio</p>`,
      text: "Hej,\n\nDette er en test e-mail fra Censio CRM via Mailgun.\n\n— Censio",
      replyTo: settings.mailFrom,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
