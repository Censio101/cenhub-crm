import type { SupabaseClient } from "@supabase/supabase-js"

import {
  recordLeadNotifyDelivery,
  type LeadNotifySkipReason,
} from "@/lib/db/lead-notify-deliveries-repository"
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

type NotifyContext = {
  organizationId: string
  primaryContactEmail: string | null | undefined
  funnelId: string
  funnelName: string
  lead: Lead
}

async function logSkipped(
  supabase: SupabaseClient,
  input: NotifyContext,
  skipReason: LeadNotifySkipReason,
  recipients: readonly string[] = []
): Promise<void> {
  await recordLeadNotifyDelivery(supabase, {
    organizationId: input.organizationId,
    leadId: input.lead.id,
    funnelId: input.funnelId,
    funnelName: input.funnelName,
    leadName: input.lead.fullName,
    recipients,
    status: "skipped",
    skipReason,
  })
}

export async function logLeadNotifySkippedFromWebhook(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    funnelId: string
    funnelName: string
    leadId: string
    leadName: string
    skipReason: Extract<LeadNotifySkipReason, "duplicate_lead" | "step_merge">
  }
): Promise<void> {
  await recordLeadNotifyDelivery(supabase, {
    organizationId: input.organizationId,
    leadId: input.leadId,
    funnelId: input.funnelId,
    funnelName: input.funnelName,
    leadName: input.leadName,
    status: "skipped",
    skipReason: input.skipReason,
  })
}

export async function logLeadNotifySteppedFormDisabled(
  supabase: SupabaseClient,
  input: NotifyContext
): Promise<void> {
  await logSkipped(supabase, input, "stepped_form_disabled")
}

export async function notifyNewLeadFromFunnelWebhook(
  supabase: SupabaseClient,
  input: NotifyContext
): Promise<void> {
  try {
    const settingsRow = await getOrganizationEmailSettings(supabase, input.organizationId)
    if (!settingsRow?.lead_notify_enabled) {
      await logSkipped(supabase, input, "notify_disabled")
      return
    }

    const funnelSelected = await isFunnelLeadNotifyEnabled(
      supabase,
      input.organizationId,
      input.funnelId
    )
    if (!funnelSelected) {
      await logSkipped(supabase, input, "funnel_not_selected")
      return
    }

    const recipients = buildLeadNotifyRecipientList({
      usePrimaryContact: settingsRow.use_primary_contact,
      primaryContactEmail: input.primaryContactEmail,
      extraNotifyEmails: settingsRow.extra_notify_emails,
    })
    if (recipients.length === 0) {
      console.warn("Lead notify skipped: no recipients", input.organizationId, input.funnelId)
      await logSkipped(supabase, input, "no_recipients")
      return
    }

    const mailgun = await resolveLeadNotifyMailgunSettings(supabase, settingsRow)
    if (!mailgun) {
      console.warn("Lead notify skipped: Mailgun not configured", input.organizationId)
      await logSkipped(supabase, input, "mailgun_missing")
      return
    }

    const [{ visible: sheet }, services] = await Promise.all([
      resolveClientDashboardSheet(supabase, input.organizationId),
      resolveOrganizationServices(supabase, input.organizationId),
    ])
    if (!sheet) {
      console.warn("Lead notify skipped: no lead sheet", input.organizationId)
      await logSkipped(supabase, input, "no_sheet")
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

    const sent = await sendMailWithMailgunSettings(mailgun, {
      to: recipients.join(", "),
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo,
    })

    await recordLeadNotifyDelivery(supabase, {
      organizationId: input.organizationId,
      leadId: input.lead.id,
      funnelId: input.funnelId,
      funnelName: input.funnelName,
      leadName: input.lead.fullName,
      recipients,
      status: "sent",
      mailgunMessageId: sent.messageId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Send failed"
    console.error("lead notify email failed", input.funnelId, error)
    await recordLeadNotifyDelivery(supabase, {
      organizationId: input.organizationId,
      leadId: input.lead.id,
      funnelId: input.funnelId,
      funnelName: input.funnelName,
      leadName: input.lead.fullName,
      status: "failed",
      errorMessage,
    })
  }
}
