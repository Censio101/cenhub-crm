import type { SupabaseClient } from "@supabase/supabase-js"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import type { OrganizationEmailSettingsRow } from "@/lib/db/organization-email-settings-repository"

const DEFAULT_MAILGUN_API_BASE = "https://api.mailgun.net"
const DEFAULT_FROM_EMAIL = "kontakt@censio.dk"
const DEFAULT_FROM_NAME = "Censio"

export type MailgunDeliverySettings = {
  mailgunApiKey: string
  mailgunDomain: string
  mailgunApiBase: string
  mailFrom: string
  mailFromName: string
  source: "organization" | "workspace"
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function resolveLeadNotifyMailgunSettings(
  supabase: SupabaseClient,
  orgRow: OrganizationEmailSettingsRow | null
): Promise<MailgunDeliverySettings | null> {
  const orgKey = trimOrNull(orgRow?.mailgun_api_key)
  const orgDomain = trimOrNull(orgRow?.mailgun_domain)
  if (orgKey && orgDomain) {
    return {
      mailgunApiKey: orgKey,
      mailgunDomain: orgDomain,
      mailgunApiBase: trimOrNull(orgRow?.mailgun_api_base) ?? DEFAULT_MAILGUN_API_BASE,
      mailFrom: trimOrNull(orgRow?.mail_from) ?? DEFAULT_FROM_EMAIL,
      mailFromName: trimOrNull(orgRow?.mail_from_name) ?? DEFAULT_FROM_NAME,
      source: "organization",
    }
  }

  const workspace = await loadWorkspaceIntegrations(supabase)
  if (!workspace.mailConfigured || !workspace.mailgunApiKey || !workspace.mailgunDomain) {
    return null
  }

  return {
    mailgunApiKey: workspace.mailgunApiKey,
    mailgunDomain: workspace.mailgunDomain,
    mailgunApiBase: workspace.mailgunApiBase,
    mailFrom: workspace.mailFrom,
    mailFromName: workspace.mailFromName,
    source: "workspace",
  }
}
