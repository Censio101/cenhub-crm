import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getOrganizationEmailSettings,
  includedColumnKeysFromRow,
  isFunnelLeadNotifyEnabled,
} from "@/lib/db/organization-email-settings-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { effectiveIncludedColumnKeys } from "@/lib/email/lead-notify-defaults"
import { buildLeadNotifyMessageDa } from "@/lib/email/format-new-lead-notify-da"
import { resolveLeadNotifyMailgunSettings } from "@/lib/email/mailgun-delivery-settings"
import { sendMailWithMailgunSettings } from "@/lib/email/mailgun"
import { parseNotifyEmailList } from "@/lib/onboarding/notify-emails"
import type { Lead } from "@/lib/leads"

export function buildLeadNotifyRecipientList(input: {
  usePrimaryContact: boolean
  primaryContactEmail: string | null | undefined
  extraNotifyEmails: string | null | undefined
}): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  if (input.usePrimaryContact) {
    const primary = input.primaryContactEmail?.trim().toLowerCase()
    if (primary && !seen.has(primary)) {
      seen.add(primary)
      out.push(primary)
    }
  }

  for (const email of parseNotifyEmailList(input.extraNotifyEmails)) {
    if (!seen.has(email)) {
      seen.add(email)
      out.push(email)
    }
  }

  return out
}

export async function notifyNewLeadFromFunnelWebhook(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    primaryContactEmail: string | null | undefined
    funnelId: string
    funnelName: string
    lead: Lead
  }
): Promise<void> {
  const settingsRow = await getOrganizationEmailSettings(supabase, input.organizationId)
  if (!settingsRow?.lead_notify_enabled) return

  const funnelSelected = await isFunnelLeadNotifyEnabled(
    supabase,
    input.organizationId,
    input.funnelId
  )
  if (!funnelSelected) return

  const recipients = buildLeadNotifyRecipientList({
    usePrimaryContact: settingsRow.use_primary_contact,
    primaryContactEmail: input.primaryContactEmail,
    extraNotifyEmails: settingsRow.extra_notify_emails,
  })
  if (recipients.length === 0) {
    console.warn("Lead notify skipped: no recipients", input.organizationId, input.funnelId)
    return
  }

  const mailgun = await resolveLeadNotifyMailgunSettings(supabase, settingsRow)
  if (!mailgun) {
    console.warn("Lead notify skipped: Mailgun not configured", input.organizationId)
    return
  }

  const [{ visible: sheet }, services] = await Promise.all([
    resolveClientDashboardSheet(supabase, input.organizationId),
    resolveOrganizationServices(supabase, input.organizationId),
  ])
  if (!sheet) {
    console.warn("Lead notify skipped: no lead sheet", input.organizationId)
    return
  }

  const storedKeys = includedColumnKeysFromRow(settingsRow)
  const includedKeys = effectiveIncludedColumnKeys(storedKeys, sheet.columns)

  const message = buildLeadNotifyMessageDa({
    lead: input.lead,
    sheet,
    services,
    includedKeys,
    funnelName: input.funnelName,
    subjectTemplate: settingsRow.notify_subject_template,
    introTemplate: settingsRow.notify_intro_template,
    closingTemplate: settingsRow.notify_closing_template,
  })

  const replyTo = input.lead.email?.trim() || undefined

  await sendMailWithMailgunSettings(mailgun, {
    to: recipients.join(", "),
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo,
  })
}
