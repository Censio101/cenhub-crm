import type { SupabaseClient } from "@supabase/supabase-js"

const SETTINGS_ID = "default"

const DEFAULT_FROM_EMAIL = "kontakt@censio.dk"
const DEFAULT_FROM_NAME = "Censio"
const DEFAULT_SITE_URL = "https://cenhub-crm.vercel.app"
const DEFAULT_MAILGUN_API_BASE = "https://api.mailgun.net"
const DEFAULT_AUTH_CALLBACK_PATH = "/auth/callback"

export type WorkspaceIntegrationsRow = {
  id: string
  mailgun_api_key: string | null
  mailgun_domain: string | null
  mailgun_api_base: string | null
  mail_from: string | null
  mail_from_name: string | null
  site_url: string | null
  auth_callback_path: string | null
  contact_form_url: string | null
  updated_at: string
}

export type WorkspaceIntegrations = {
  mailgunApiKey: string | null
  mailgunDomain: string | null
  mailgunApiBase: string
  mailFrom: string
  mailFromName: string
  siteUrl: string
  authCallbackPath: string
  contactFormUrl: string | null
  updatedAt: string | null
}

export type WorkspaceIntegrationsInput = {
  mailgunApiKey?: string | null
  mailgunDomain?: string | null
  mailgunApiBase?: string | null
  mailFrom?: string | null
  mailFromName?: string | null
  siteUrl?: string | null
  authCallbackPath?: string | null
  contactFormUrl?: string | null
}

export type WorkspaceIntegrationsPublic = WorkspaceIntegrations & {
  mailConfigured: boolean
  mailgunApiKeyMasked: string | null
  authCallbackUrl: string
  loginUrl: string
  inviteRedirectUrl: string
  source: {
    mailgunApiKey: "database" | "environment" | "missing"
    mailgunDomain: "database" | "environment" | "missing"
    siteUrl: "database" | "environment" | "default"
  }
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function integrationsFromEnv(): Partial<WorkspaceIntegrations> {
  return {
    mailgunApiKey: trimOrNull(process.env.MAILGUN_API_KEY),
    mailgunDomain: trimOrNull(process.env.MAILGUN_DOMAIN),
    mailgunApiBase:
      trimOrNull(process.env.MAILGUN_API_BASE) ?? DEFAULT_MAILGUN_API_BASE,
    mailFrom: trimOrNull(process.env.MAIL_FROM) ?? DEFAULT_FROM_EMAIL,
    mailFromName: trimOrNull(process.env.MAIL_FROM_NAME) ?? DEFAULT_FROM_NAME,
    siteUrl: trimOrNull(process.env.CRM_SITE_URL) ?? DEFAULT_SITE_URL,
    authCallbackPath: DEFAULT_AUTH_CALLBACK_PATH,
    contactFormUrl: trimOrNull(process.env.CONTACT_FORM_URL),
  }
}

function pickValue(
  dbValue: string | null | undefined,
  envValue: string | null | undefined,
  fallback: string
): { value: string; source: "database" | "environment" | "default" | "missing" } {
  const db = trimOrNull(dbValue ?? null)
  if (db) return { value: db, source: "database" }
  const env = trimOrNull(envValue ?? null)
  if (env) return { value: env, source: "environment" }
  if (fallback) return { value: fallback, source: "default" }
  return { value: "", source: "missing" }
}

function pickSecret(
  dbValue: string | null | undefined,
  envValue: string | null | undefined
): { value: string | null; source: "database" | "environment" | "missing" } {
  const db = trimOrNull(dbValue ?? null)
  if (db) return { value: db, source: "database" }
  const env = trimOrNull(envValue ?? null)
  if (env) return { value: env, source: "environment" }
  return { value: null, source: "missing" }
}

export function maskSecret(value: string | null): string | null {
  if (!value) return null
  if (value.length <= 8) return "••••••••"
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "")
}

function normalizeAuthCallbackPath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_AUTH_CALLBACK_PATH
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

export function mergeWorkspaceIntegrations(
  row: WorkspaceIntegrationsRow | null
): WorkspaceIntegrationsPublic {
  const env = integrationsFromEnv()

  const mailgunApiKey = pickSecret(row?.mailgun_api_key, env.mailgunApiKey ?? null)
  const mailgunDomain = pickSecret(row?.mailgun_domain, env.mailgunDomain ?? null)
  const mailgunApiBase = pickValue(
    row?.mailgun_api_base,
    env.mailgunApiBase,
    DEFAULT_MAILGUN_API_BASE
  )
  const mailFrom = pickValue(row?.mail_from, env.mailFrom, DEFAULT_FROM_EMAIL)
  const mailFromName = pickValue(row?.mail_from_name, env.mailFromName, DEFAULT_FROM_NAME)
  const siteUrl = pickValue(row?.site_url, env.siteUrl, DEFAULT_SITE_URL)
  const authCallbackPath = pickValue(
    row?.auth_callback_path,
    env.authCallbackPath,
    DEFAULT_AUTH_CALLBACK_PATH
  )
  const contactFormUrl = pickValue(row?.contact_form_url, env.contactFormUrl, "")

  const normalizedSiteUrl = normalizeSiteUrl(siteUrl.value)
  const normalizedAuthPath = normalizeAuthCallbackPath(authCallbackPath.value)
  const inviteRedirectUrl = `${normalizedSiteUrl}${normalizedAuthPath}?next=/`

  return {
    mailgunApiKey: mailgunApiKey.value,
    mailgunDomain: mailgunDomain.value,
    mailgunApiBase: mailgunApiBase.value,
    mailFrom: mailFrom.value,
    mailFromName: mailFromName.value,
    siteUrl: normalizedSiteUrl,
    authCallbackPath: normalizedAuthPath,
    contactFormUrl: trimOrNull(contactFormUrl.value),
    updatedAt: row?.updated_at ?? null,
    mailConfigured: Boolean(mailgunApiKey.value && mailgunDomain.value),
    mailgunApiKeyMasked: maskSecret(mailgunApiKey.value),
    authCallbackUrl: inviteRedirectUrl,
    loginUrl: `${normalizedSiteUrl}/login`,
    inviteRedirectUrl,
    source: {
      mailgunApiKey: mailgunApiKey.source,
      mailgunDomain: mailgunDomain.source,
      siteUrl:
        siteUrl.source === "missing"
          ? "default"
          : siteUrl.source,
    },
  }
}

function isMissingSettingsTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("censio_workspace_settings"))
  )
}

export async function getWorkspaceIntegrationsRow(
  supabase: SupabaseClient
): Promise<WorkspaceIntegrationsRow | null> {
  const { data, error } = await supabase
    .from("censio_workspace_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTable(error)) return null
    throw error
  }

  return (data as WorkspaceIntegrationsRow | null) ?? null
}

export async function loadWorkspaceIntegrations(
  supabase: SupabaseClient
): Promise<WorkspaceIntegrationsPublic> {
  const row = await getWorkspaceIntegrationsRow(supabase)
  return mergeWorkspaceIntegrations(row)
}

export async function saveWorkspaceIntegrations(
  supabase: SupabaseClient,
  input: WorkspaceIntegrationsInput,
  currentRow: WorkspaceIntegrationsRow | null
): Promise<WorkspaceIntegrationsPublic> {
  const nextRow: WorkspaceIntegrationsRow = {
    id: SETTINGS_ID,
    mailgun_api_key:
      input.mailgunApiKey === undefined
        ? currentRow?.mailgun_api_key ?? null
        : trimOrNull(input.mailgunApiKey),
    mailgun_domain:
      input.mailgunDomain === undefined
        ? currentRow?.mailgun_domain ?? null
        : trimOrNull(input.mailgunDomain),
    mailgun_api_base:
      input.mailgunApiBase === undefined
        ? currentRow?.mailgun_api_base ?? null
        : trimOrNull(input.mailgunApiBase),
    mail_from:
      input.mailFrom === undefined ? currentRow?.mail_from ?? null : trimOrNull(input.mailFrom),
    mail_from_name:
      input.mailFromName === undefined
        ? currentRow?.mail_from_name ?? null
        : trimOrNull(input.mailFromName),
    site_url:
      input.siteUrl === undefined ? currentRow?.site_url ?? null : trimOrNull(input.siteUrl),
    auth_callback_path:
      input.authCallbackPath === undefined
        ? currentRow?.auth_callback_path ?? DEFAULT_AUTH_CALLBACK_PATH
        : normalizeAuthCallbackPath(input.authCallbackPath ?? ""),
    contact_form_url:
      input.contactFormUrl === undefined
        ? currentRow?.contact_form_url ?? null
        : trimOrNull(input.contactFormUrl),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("censio_workspace_settings")
    .upsert(nextRow, { onConflict: "id" })
    .select("*")
    .single()

  if (error) {
    if (isMissingSettingsTable(error)) {
      throw new Error(
        "Integrations table is missing. Run migration 005_workspace_integrations.sql in Supabase."
      )
    }
    throw error
  }

  return mergeWorkspaceIntegrations(data as WorkspaceIntegrationsRow)
}

export function isMailConfigured(settings: WorkspaceIntegrationsPublic): boolean {
  return settings.mailConfigured
}
