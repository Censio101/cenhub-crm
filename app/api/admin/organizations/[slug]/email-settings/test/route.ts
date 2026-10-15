import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  getOrganizationEmailSettings,
  includedColumnKeysFromRow,
} from "@/lib/db/organization-email-settings-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { effectiveIncludedColumnKeys } from "@/lib/email/lead-notify-defaults"
import {
  buildLeadNotifyMessageDa,
  sampleLeadForNotifyPreview,
} from "@/lib/email/format-new-lead-notify-da"
import { resolveLeadNotifyMailgunSettings } from "@/lib/email/mailgun-delivery-settings"
import { sendMailWithMailgunSettings } from "@/lib/email/mailgun"
import {
  buildLeadNotifyRecipientList,
} from "@/lib/leads/notify-new-lead"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const settingsRow = await getOrganizationEmailSettings(admin, organization.id)
    const recipients = buildLeadNotifyRecipientList({
      usePrimaryContact: settingsRow?.use_primary_contact ?? true,
      primaryContactEmail: organization.primary_contact_email,
      extraNotifyEmails: settingsRow?.extra_notify_emails,
    })
    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients configured" }, { status: 400 })
    }

    const mailgun = await resolveLeadNotifyMailgunSettings(admin, settingsRow)
    if (!mailgun) {
      return NextResponse.json({ error: "Mailgun is not configured" }, { status: 400 })
    }

    const [{ visible: sheet }, services] = await Promise.all([
      resolveClientDashboardSheet(admin, organization.id),
      resolveOrganizationServices(admin, organization.id),
    ])
    if (!sheet) {
      return NextResponse.json({ error: "Lead sheet not found" }, { status: 400 })
    }

    const includedKeys = effectiveIncludedColumnKeys(
      includedColumnKeysFromRow(settingsRow),
      sheet.columns
    )
    const sample = sampleLeadForNotifyPreview()
    if (services[0]) sample.serviceIds = [services[0].id]

    const message = buildLeadNotifyMessageDa({
      lead: sample,
      sheet,
      services,
      includedKeys,
      funnelName: "Test webhook",
      subjectTemplate: settingsRow?.notify_subject_template,
      introTemplate: settingsRow?.notify_intro_template,
      closingTemplate: settingsRow?.notify_closing_template,
    })

    await sendMailWithMailgunSettings(mailgun, {
      to: recipients.join(", "),
      subject: `[Test] ${message.subject}`,
      html: message.html,
      text: message.text,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
