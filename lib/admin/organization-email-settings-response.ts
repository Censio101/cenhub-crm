import type { SupabaseClient } from "@supabase/supabase-js"

import { maskSecret } from "@/lib/admin/workspace-integrations"
import {
  getOrganizationEmailSettings,
  includedColumnKeysFromRow,
  listNotifyFunnelIds,
} from "@/lib/db/organization-email-settings-repository"
import { listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import {
  DEFAULT_NOTIFY_CLOSING_TEMPLATE,
  DEFAULT_NOTIFY_INTRO_TEMPLATE,
  DEFAULT_NOTIFY_SUBJECT_TEMPLATE,
  effectiveIncludedColumnKeys,
  templateOrDefault,
} from "@/lib/email/lead-notify-defaults"
import { buildLeadNotifyPreview } from "@/lib/email/format-new-lead-notify-da"
import { builtinLabelDa } from "@/lib/email/lead-notify-labels-da"
import { columnVisibilityKey } from "@/lib/lead-sheet/client-visibility"
import { resolveLeadNotifyMailgunSettings } from "@/lib/email/mailgun-delivery-settings"
import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"

export async function buildOrganizationEmailSettingsResponse(
  supabase: SupabaseClient,
  organization: {
    id: string
    primary_contact_email?: string | null
  }
) {
  const settingsRow = await getOrganizationEmailSettings(supabase, organization.id)
  const [notifyFunnelIds, funnels, dashboardSheet, services, mailgun, workspace] =
    await Promise.all([
      listNotifyFunnelIds(supabase, organization.id),
      listLeadFunnelsForOrganization(supabase, organization.id),
      resolveClientDashboardSheet(supabase, organization.id),
      resolveOrganizationServices(supabase, organization.id),
      resolveLeadNotifyMailgunSettings(supabase, settingsRow),
      loadWorkspaceIntegrations(supabase),
    ])

  const notifySet = new Set(notifyFunnelIds)
  const visible = dashboardSheet.visible
  const storedIncluded = includedColumnKeysFromRow(settingsRow)
  const includedKeys =
    visible != null ? effectiveIncludedColumnKeys(storedIncluded, visible.columns) : []
  const includedSet = new Set(includedKeys)

  const emailColumns =
    visible?.columns
      .slice()
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((column) => {
        const key = columnVisibilityKey(column)
        return {
          key,
          labelDa:
            column.kind === "builtin"
              ? builtinLabelDa(column.builtinKey)
              : column.customField.label,
          kind: column.kind,
          included: includedSet.has(key),
        }
      }) ?? []

  const exampleFunnelName = funnels[0]?.name ?? "Webhook"
  const emailPreview =
    visible != null
      ? buildLeadNotifyPreview({
          sheet: visible,
          services,
          includedKeys,
          funnelName: exampleFunnelName,
          subjectTemplate: settingsRow?.notify_subject_template,
          introTemplate: settingsRow?.notify_intro_template,
          closingTemplate: settingsRow?.notify_closing_template,
        })
      : {
          subjectExample: templateOrDefault(
            settingsRow?.notify_subject_template,
            DEFAULT_NOTIFY_SUBJECT_TEMPLATE
          ).replace("{webhookNavn}", exampleFunnelName),
          intro: templateOrDefault(settingsRow?.notify_intro_template, DEFAULT_NOTIFY_INTRO_TEMPLATE),
          closing: templateOrDefault(
            settingsRow?.notify_closing_template,
            DEFAULT_NOTIFY_CLOSING_TEMPLATE
          ),
          bodyStructure: [] as { label: string; placeholder: string }[],
        }

  const orgMailConfigured = Boolean(
    settingsRow?.mailgun_api_key?.trim() && settingsRow?.mailgun_domain?.trim()
  )

  return {
    leadNotifyEnabled: settingsRow?.lead_notify_enabled ?? false,
    usePrimaryContact: settingsRow?.use_primary_contact ?? true,
    extraNotifyEmails: settingsRow?.extra_notify_emails ?? "",
    primaryContactEmail: organization.primary_contact_email?.trim() || null,
    notifySubjectTemplate: templateOrDefault(
      settingsRow?.notify_subject_template,
      DEFAULT_NOTIFY_SUBJECT_TEMPLATE
    ),
    notifyIntroTemplate: templateOrDefault(
      settingsRow?.notify_intro_template,
      DEFAULT_NOTIFY_INTRO_TEMPLATE
    ),
    notifyClosingTemplate: templateOrDefault(
      settingsRow?.notify_closing_template,
      DEFAULT_NOTIFY_CLOSING_TEMPLATE
    ),
    notifyIncludedColumnKeys: includedKeys,
    mailgunDomain: settingsRow?.mailgun_domain ?? "",
    mailgunApiBase: settingsRow?.mailgun_api_base?.trim() || "https://api.mailgun.net",
    mailFrom: settingsRow?.mail_from ?? "",
    mailFromName: settingsRow?.mail_from_name ?? "",
    mailgunApiKeyMasked: maskSecret(settingsRow?.mailgun_api_key ?? null),
    orgMailConfigured,
    workspaceMailConfigured: workspace.mailConfigured,
    mailSource: mailgun?.source ?? null,
    funnels: funnels.map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
      slug: funnel.slug,
      platform: funnel.platform,
      enabled: funnel.enabled,
      notifyEnabled: notifySet.has(funnel.id),
    })),
    emailColumns,
    emailPreview,
  }
}

export function filterValidIncludedColumnKeys(
  keys: string[],
  allowedKeys: Set<string>
): { valid: string[]; stripped: string[] } {
  const valid: string[] = []
  const stripped: string[] = []
  const seen = new Set<string>()
  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      stripped.push(key)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    valid.push(key)
  }
  return { valid, stripped }
}
