import type { SupabaseClient } from "@supabase/supabase-js"

export type OrganizationEmailSettingsRow = {
  organization_id: string
  lead_notify_enabled: boolean
  mailgun_api_key: string | null
  mailgun_domain: string | null
  mailgun_api_base: string | null
  mail_from: string | null
  mail_from_name: string | null
  use_primary_contact: boolean
  extra_notify_emails: string | null
  notify_subject_template: string | null
  notify_intro_template: string | null
  notify_closing_template: string | null
  notify_included_column_keys: unknown
  created_at: string
  updated_at: string
}

function parseIncludedKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

export async function getOrganizationEmailSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationEmailSettingsRow | null> {
  const { data, error } = await supabase
    .from("organization_email_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  return (data as OrganizationEmailSettingsRow | null) ?? null
}

type EmailSettingsPatch = Partial<{
  leadNotifyEnabled: boolean
  mailgunApiKey: string | null | undefined
  mailgunDomain: string | null
  mailgunApiBase: string | null
  mailFrom: string | null
  mailFromName: string | null
  usePrimaryContact: boolean
  extraNotifyEmails: string | null
  notifySubjectTemplate: string | null
  notifyIntroTemplate: string | null
  notifyClosingTemplate: string | null
  notifyIncludedColumnKeys: string[]
}>

function mergedRow(
  organizationId: string,
  existing: OrganizationEmailSettingsRow | null,
  patch: EmailSettingsPatch
): Record<string, unknown> {
  const mailgunApiKey =
    patch.mailgunApiKey !== undefined
      ? patch.mailgunApiKey?.trim() || null
      : (existing?.mailgun_api_key ?? null)

  return {
    organization_id: organizationId,
    lead_notify_enabled: patch.leadNotifyEnabled ?? existing?.lead_notify_enabled ?? false,
    mailgun_api_key: mailgunApiKey,
    mailgun_domain:
      patch.mailgunDomain !== undefined
        ? patch.mailgunDomain?.trim() || null
        : (existing?.mailgun_domain ?? null),
    mailgun_api_base:
      patch.mailgunApiBase !== undefined
        ? patch.mailgunApiBase?.trim() || null
        : (existing?.mailgun_api_base ?? null),
    mail_from:
      patch.mailFrom !== undefined ? patch.mailFrom?.trim() || null : (existing?.mail_from ?? null),
    mail_from_name:
      patch.mailFromName !== undefined
        ? patch.mailFromName?.trim() || null
        : (existing?.mail_from_name ?? null),
    use_primary_contact: patch.usePrimaryContact ?? existing?.use_primary_contact ?? true,
    extra_notify_emails:
      patch.extraNotifyEmails !== undefined
        ? patch.extraNotifyEmails
        : (existing?.extra_notify_emails ?? null),
    notify_subject_template:
      patch.notifySubjectTemplate !== undefined
        ? patch.notifySubjectTemplate?.trim() || null
        : (existing?.notify_subject_template ?? null),
    notify_intro_template:
      patch.notifyIntroTemplate !== undefined
        ? patch.notifyIntroTemplate?.trim() || null
        : (existing?.notify_intro_template ?? null),
    notify_closing_template:
      patch.notifyClosingTemplate !== undefined
        ? patch.notifyClosingTemplate?.trim() || null
        : (existing?.notify_closing_template ?? null),
    notify_included_column_keys:
      patch.notifyIncludedColumnKeys !== undefined
        ? patch.notifyIncludedColumnKeys
        : parseIncludedKeys(existing?.notify_included_column_keys ?? []),
  }
}

export async function upsertOrganizationEmailSettings(
  supabase: SupabaseClient,
  organizationId: string,
  patch: EmailSettingsPatch,
  existing: OrganizationEmailSettingsRow | null
): Promise<OrganizationEmailSettingsRow> {
  const row = mergedRow(organizationId, existing, patch)

  const { data, error } = await supabase
    .from("organization_email_settings")
    .upsert(row, { onConflict: "organization_id" })
    .select("*")
    .single()

  if (error) throw error
  return data as OrganizationEmailSettingsRow
}

export function includedColumnKeysFromRow(row: OrganizationEmailSettingsRow | null): string[] {
  if (!row) return []
  return parseIncludedKeys(row.notify_included_column_keys)
}

export async function listNotifyFunnelIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_notify_funnels")
    .select("funnel_id")
    .eq("organization_id", organizationId)

  if (error) throw error
  return (data ?? []).map((row) => row.funnel_id as string)
}

export async function replaceNotifyFunnels(
  supabase: SupabaseClient,
  organizationId: string,
  funnelIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("organization_notify_funnels")
    .delete()
    .eq("organization_id", organizationId)

  if (deleteError) throw deleteError
  if (funnelIds.length === 0) return

  const { error: insertError } = await supabase.from("organization_notify_funnels").insert(
    funnelIds.map((funnelId) => ({
      organization_id: organizationId,
      funnel_id: funnelId,
    }))
  )
  if (insertError) throw insertError
}

export async function isFunnelLeadNotifyEnabled(
  supabase: SupabaseClient,
  organizationId: string,
  funnelId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("organization_notify_funnels")
    .select("funnel_id")
    .eq("organization_id", organizationId)
    .eq("funnel_id", funnelId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}
