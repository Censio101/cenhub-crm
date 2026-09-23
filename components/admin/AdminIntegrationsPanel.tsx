"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import {
  CopyIcon,
  LinkIcon,
  MailIcon,
  PlugZapIcon,
  SaveIcon,
  SendIcon,
} from "lucide-react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type IntegrationsSettings = {
  mailgunDomain: string | null
  mailgunApiBase: string
  mailFrom: string
  mailFromName: string
  siteUrl: string
  authCallbackPath: string
  contactFormUrl: string | null
  updatedAt: string | null
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

function ReadonlyLink({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      {description ? (
        <span className="text-[12px] text-muted-foreground">{description}</span>
      ) : null}
      <div className="flex gap-2">
        <input
          className={cn(adminFieldClass, "font-mono text-[13px]")}
          value={value}
          readOnly
        />
        <Button type="button" variant="outline" className="h-11 shrink-0 px-3" onClick={handleCopy}>
          <CopyIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </label>
  )
}

function getMailReadinessPercent(input: {
  mailgunDomain: string
  hasApiKey: boolean
  mailFrom: string
  siteUrl: string
}): number {
  const checks = [
    Boolean(input.mailgunDomain.trim()),
    input.hasApiKey,
    Boolean(input.mailFrom.trim()),
    Boolean(input.siteUrl.trim()),
  ]
  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}

function BatteryIndicator({
  percent,
  tone,
}: {
  percent: number
  tone: "ready" | "partial" | "empty"
}) {
  const toneClass =
    tone === "ready"
      ? "border-emerald-600 text-emerald-600"
      : tone === "partial"
        ? "border-amber-500 text-amber-500"
        : "border-[#d3c3b2] text-muted-foreground"

  const fillClass =
    tone === "ready"
      ? "bg-emerald-500"
      : tone === "partial"
        ? "bg-amber-400"
        : "bg-[#d3c3b2]"

  return (
    <div className={cn("flex items-center", toneClass)} aria-hidden="true">
      <div className={cn("relative h-8 w-[3.4rem] rounded-[6px] border-2 p-[2px]", toneClass)}>
        <div className="h-full overflow-hidden rounded-[3px] bg-[#f0e8df]/80">
          <div
            className={cn("h-full rounded-[3px] transition-all duration-500 ease-out", fillClass)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className={cn("h-3 w-[5px] rounded-r-[2px] border-2 border-l-0", toneClass)} />
    </div>
  )
}

function MailReadinessWidget({
  mailgunDomain,
  hasApiKey,
  mailFrom,
  siteUrl,
}: {
  mailgunDomain: string
  hasApiKey: boolean
  mailFrom: string
  siteUrl: string
}) {
  const { t } = useLanguage()
  const percent = getMailReadinessPercent({ mailgunDomain, hasApiKey, mailFrom, siteUrl })
  const tone = percent === 100 ? "ready" : percent > 0 ? "partial" : "empty"
  const title =
    percent === 100
      ? t("integrationsMailReady")
      : percent > 0
        ? t("integrationsMailStatusPartial")
        : t("integrationsMailNotReady")

  return (
    <section
      className={cn(
        adminSectionCardClass,
        "overflow-hidden",
        tone === "ready" && "ring-1 ring-emerald-200",
        tone === "partial" && "ring-1 ring-amber-200"
      )}
    >
      <div
        className={cn(
          "grid gap-4 px-5 py-4 sm:grid-cols-[auto_1fr] sm:items-center",
          tone === "ready"
            ? "bg-[linear-gradient(135deg,rgba(16,185,129,0.08)_0%,rgba(255,255,255,0)_55%)]"
            : tone === "partial"
              ? "bg-[linear-gradient(135deg,rgba(245,158,11,0.08)_0%,rgba(255,255,255,0)_55%)]"
              : "bg-[#faf8f6]/60"
        )}
      >
        <BatteryIndicator percent={percent} tone={tone} />

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {percent === 100
              ? t("integrationsMailReadyHint")
              : t("integrationsMailNotReadyHint")}
          </p>
        </div>
      </div>
    </section>
  )
}

function SourceBadge({
  source,
}: {
  source: "database" | "environment" | "missing" | "default"
}) {
  const { t } = useLanguage()
  const label =
    source === "database"
      ? t("integrationsSourceDatabase")
      : source === "environment"
        ? t("integrationsSourceEnvironment")
        : source === "default"
          ? t("integrationsSourceDefault")
          : t("integrationsSourceMissing")

  return (
    <span className="rounded-full bg-[#faf8f6] px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-[#e8e0d8]">
      {label}
    </span>
  )
}

export function AdminIntegrationsPanel() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [settings, setSettings] = useState<IntegrationsSettings | null>(null)

  const [mailgunApiKey, setMailgunApiKey] = useState("")
  const [mailgunDomain, setMailgunDomain] = useState("")
  const [mailgunApiBase, setMailgunApiBase] = useState("https://api.mailgun.net")
  const [mailFrom, setMailFrom] = useState("kontakt@censio.dk")
  const [mailFromName, setMailFromName] = useState("Censio")
  const [siteUrl, setSiteUrl] = useState("")
  const [authCallbackPath, setAuthCallbackPath] = useState("/auth/callback")
  const [contactFormUrl, setContactFormUrl] = useState("")
  const [testEmail, setTestEmail] = useState("")

  const dismissNotice = useCallback(() => setNotice(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(notice, dismissNotice)
  useAutoDismiss(error, dismissError, 6000)

  async function loadSettings() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/integrations", { cache: "no-store" })
      const data = (await response.json()) as {
        settings?: IntegrationsSettings
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? t("integrationsErrorLoad"))
      const next = data.settings!
      setSettings(next)
      setMailgunDomain(next.mailgunDomain ?? "")
      setMailgunApiBase(next.mailgunApiBase)
      setMailFrom(next.mailFrom)
      setMailFromName(next.mailFromName)
      setSiteUrl(next.siteUrl)
      setAuthCallbackPath(next.authCallbackPath)
      setContactFormUrl(next.contactFormUrl ?? "")
      setMailgunApiKey("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("integrationsErrorLoad"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailgunApiKey: mailgunApiKey.trim() || undefined,
          mailgunDomain,
          mailgunApiBase,
          mailFrom,
          mailFromName,
          siteUrl,
          authCallbackPath,
          contactFormUrl,
        }),
      })
      const data = (await response.json()) as {
        settings?: IntegrationsSettings
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? t("integrationsErrorSave"))

      setSettings(data.settings!)
      setMailgunApiKey("")
      setNotice(t("integrationsSaved"))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("integrationsErrorSave"))
    } finally {
      setSaving(false)
    }
  }

  async function handleTestEmail() {
    if (!testEmail.trim()) return
    setTesting(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("integrationsErrorTest"))
      setNotice(t("integrationsTestSent", { email: testEmail.trim() }))
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : t("integrationsErrorTest"))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("brand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          {t("integrationsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("integrationsDescription")}</p>
      </header>

      {loading ? (
        <section className={cn(adminSectionCardClass, "overflow-hidden")}>
          <div className="animate-pulse px-5 py-6">
            <div className="h-8 w-[3.4rem] rounded-[6px] bg-muted" />
            <div className="mt-4 h-4 w-40 rounded bg-muted" />
            <div className="mt-2 h-3 w-64 rounded bg-muted" />
          </div>
        </section>
      ) : (
        <form className="grid gap-6" onSubmit={handleSave}>
          <MailReadinessWidget
            mailgunDomain={mailgunDomain}
            hasApiKey={Boolean(settings?.mailgunApiKeyMasked || mailgunApiKey.trim())}
            mailFrom={mailFrom}
            siteUrl={siteUrl}
          />

          <section className={cn(adminSectionCardClass, "overflow-hidden")}>
            <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
              <span className={adminIconBoxClass("brand")}>
                <MailIcon className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("integrationsMailgunTitle")}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {t("integrationsMailgunDescription")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-4">
              <label className="grid gap-1.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  {t("integrationsMailgunDomain")}
                  <SourceBadge source={settings?.source.mailgunDomain ?? "missing"} />
                </span>
                <input
                  className={adminFieldClass}
                  value={mailgunDomain}
                  onChange={(event) => setMailgunDomain(event.target.value)}
                  placeholder="censio.dk"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  {t("integrationsMailgunApiKey")}
                  {settings?.mailgunApiKeyMasked ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                      {settings.mailgunApiKeyMasked}
                    </span>
                  ) : null}
                </span>
                <input
                  type="password"
                  className={adminFieldClass}
                  value={mailgunApiKey}
                  onChange={(event) => setMailgunApiKey(event.target.value)}
                  placeholder={t("integrationsMailgunApiKeyPlaceholder")}
                  autoComplete="off"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">
                  {t("integrationsMailgunRegion")}
                </span>
                <select
                  className={adminFieldClass}
                  value={mailgunApiBase}
                  onChange={(event) => setMailgunApiBase(event.target.value)}
                >
                  <option value="https://api.mailgun.net">{t("integrationsMailgunRegionUs")}</option>
                  <option value="https://api.eu.mailgun.net">
                    {t("integrationsMailgunRegionEu")}
                  </option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    {t("integrationsMailFrom")}
                  </span>
                  <input
                    className={adminFieldClass}
                    value={mailFrom}
                    onChange={(event) => setMailFrom(event.target.value)}
                    placeholder="kontakt@censio.dk"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    {t("integrationsMailFromName")}
                  </span>
                  <input
                    className={adminFieldClass}
                    value={mailFromName}
                    onChange={(event) => setMailFromName(event.target.value)}
                    placeholder="Censio"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className={cn(adminSectionCardClass, "overflow-hidden")}>
            <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
              <span className={adminIconBoxClass("blue")}>
                <LinkIcon className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("integrationsLinksTitle")}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {t("integrationsLinksDescription")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-4">
              <label className="grid gap-1.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  {t("integrationsSiteUrl")}
                  <SourceBadge source={settings?.source.siteUrl ?? "default"} />
                </span>
                <input
                  className={adminFieldClass}
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  placeholder="https://crm.censio.dk"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">
                  {t("integrationsAuthCallbackPath")}
                </span>
                <input
                  className={adminFieldClass}
                  value={authCallbackPath}
                  onChange={(event) => setAuthCallbackPath(event.target.value)}
                  placeholder="/auth/callback"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">
                  {t("integrationsContactFormUrl")}
                </span>
                <input
                  className={adminFieldClass}
                  value={contactFormUrl}
                  onChange={(event) => setContactFormUrl(event.target.value)}
                  placeholder="https://censio.dk/kontakt"
                />
              </label>

              {settings ? (
                <div className="grid gap-4 rounded-xl border border-[#e8e0d8] bg-[#faf8f6]/60 p-4">
                  <ReadonlyLink
                    label={t("integrationsInviteRedirectUrl")}
                    value={settings.inviteRedirectUrl}
                    description={t("integrationsInviteRedirectHint")}
                  />
                  <ReadonlyLink
                    label={t("integrationsLoginUrl")}
                    value={settings.loginUrl}
                  />
                  <ReadonlyLink
                    label={t("integrationsAuthCallbackUrl")}
                    value={settings.authCallbackUrl}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className={cn(adminSectionCardClass, "overflow-hidden")}>
            <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
              <span className={adminIconBoxClass("violet")}>
                <PlugZapIcon className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("integrationsTestTitle")}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {t("integrationsTestDescription")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end">
              <label className="grid min-w-0 flex-1 gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">
                  {t("integrationsTestEmail")}
                </span>
                <input
                  type="email"
                  className={adminFieldClass}
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="kontakt@censio.dk"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 gap-2"
                disabled={testing || !testEmail.trim()}
                onClick={() => {
                  void handleTestEmail()
                }}
              >
                <SendIcon className="size-4" aria-hidden="true" />
                {testing ? t("sending") : t("integrationsSendTest")}
              </Button>
            </div>
          </section>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800" role="status">
              {notice}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full gap-2 sm:w-fit" disabled={saving}>
            <SaveIcon className="size-4" aria-hidden="true" />
            {saving ? t("saving") : t("integrationsSave")}
          </Button>
        </form>
      )}
    </div>
  )
}
