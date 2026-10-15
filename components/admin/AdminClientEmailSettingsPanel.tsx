"use client"

import { useMemo, useState } from "react"
import { Loader2Icon, XIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ModalShell } from "@/components/admin/ModalShell"
import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

type EmailColumn = {
  key: string
  labelDa: string
  kind: "builtin" | "custom"
  included: boolean
}

type FunnelRow = {
  id: string
  name: string
  notifyEnabled: boolean
}

type SettingsDto = {
  leadNotifyEnabled: boolean
  usePrimaryContact: boolean
  extraNotifyEmails: string
  primaryContactEmail: string | null
  notifySubjectTemplate: string
  notifyIntroTemplate: string
  notifyClosingTemplate: string
  notifyIncludedColumnKeys: string[]
  mailgunDomain: string
  mailgunApiBase: string
  mailFrom: string
  mailFromName: string
  mailgunApiKeyMasked: string | null
  orgMailConfigured: boolean
  workspaceMailConfigured: boolean
  mailSource: "organization" | "workspace" | null
  funnels: FunnelRow[]
  emailColumns: EmailColumn[]
  emailPreview: {
    subjectExample: string
    intro: string
    closing: string
    bodyStructure: { label: string; placeholder: string }[]
  }
}

const inputClass =
  "w-full rounded-lg border border-[#d3c3b2] bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

function EmailSettingsPanelSkeleton() {
  return (
    <div className="contents" aria-busy="true">
      <div className={cn(adminSectionCardClass, "flex items-center justify-between gap-3 p-5")}>
        <div className="skeleton-shimmer h-5 w-44 rounded-md" />
        <div className="skeleton-shimmer h-6 w-10 shrink-0 rounded-full" />
      </div>
      <div className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <div className="skeleton-shimmer h-5 w-36 rounded-md" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton-shimmer h-10 rounded-lg sm:col-span-2" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
        </div>
      </div>
      <div className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <div className="skeleton-shimmer h-5 w-32 rounded-md" />
        <div className="skeleton-shimmer h-5 w-full max-w-md rounded-md" />
        <div className="skeleton-shimmer h-20 w-full rounded-lg" />
      </div>
      <div className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <div className="flex items-center justify-between gap-2">
          <div className="skeleton-shimmer h-5 w-48 rounded-md" />
          <div className="skeleton-shimmer h-9 w-28 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="skeleton-shimmer h-8 w-28 rounded-full" />
          <div className="skeleton-shimmer h-8 w-36 rounded-full" />
        </div>
      </div>
      <div className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <div className="skeleton-shimmer h-5 w-40 rounded-md" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg" />
        <div className="skeleton-shimmer h-16 w-full rounded-lg" />
        <div className="skeleton-shimmer h-9 w-36 rounded-xl" />
        <div className="skeleton-shimmer h-20 w-full rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
        <div className="skeleton-shimmer h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}

export function AdminClientEmailSettingsPanel() {
  const { slug } = useAdminClient()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [leadNotifyEnabled, setLeadNotifyEnabled] = useState(false)
  const [usePrimaryContact, setUsePrimaryContact] = useState(true)
  const [extraNotifyEmails, setExtraNotifyEmails] = useState("")
  const [primaryContactEmail, setPrimaryContactEmail] = useState<string | null>(null)
  const [notifySubjectTemplate, setNotifySubjectTemplate] = useState("")
  const [notifyIntroTemplate, setNotifyIntroTemplate] = useState("")
  const [notifyClosingTemplate, setNotifyClosingTemplate] = useState("")
  const [includedKeys, setIncludedKeys] = useState<string[]>([])
  const [mailgunApiKey, setMailgunApiKey] = useState("")
  const [mailgunDomain, setMailgunDomain] = useState("")
  const [mailgunApiBase, setMailgunApiBase] = useState("https://api.mailgun.net")
  const [mailFrom, setMailFrom] = useState("")
  const [mailFromName, setMailFromName] = useState("")
  const [mailgunApiKeyMasked, setMailgunApiKeyMasked] = useState<string | null>(null)
  const [orgMailConfigured, setOrgMailConfigured] = useState(false)
  const [workspaceMailConfigured, setWorkspaceMailConfigured] = useState(false)
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [emailColumns, setEmailColumns] = useState<EmailColumn[]>([])
  const [preview, setPreview] = useState<SettingsDto["emailPreview"] | null>(null)

  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [fieldsDraft, setFieldsDraft] = useState<string[]>([])
  const [webhooksOpen, setWebhooksOpen] = useState(false)
  const [webhooksDraft, setWebhooksDraft] = useState<string[]>([])
  const [removeFunnelTarget, setRemoveFunnelTarget] = useState<FunnelRow | null>(null)

  const selectedFunnels = useMemo(
    () => funnels.filter((funnel) => funnel.notifyEnabled),
    [funnels]
  )
  const funnelsAvailableToAdd = useMemo(
    () => funnels.filter((funnel) => !funnel.notifyEnabled),
    [funnels]
  )

  function applySettings(settings: SettingsDto) {
    setLeadNotifyEnabled(settings.leadNotifyEnabled)
    setUsePrimaryContact(settings.usePrimaryContact)
    setExtraNotifyEmails(settings.extraNotifyEmails)
    setPrimaryContactEmail(settings.primaryContactEmail)
    setNotifySubjectTemplate(settings.notifySubjectTemplate)
    setNotifyIntroTemplate(settings.notifyIntroTemplate)
    setNotifyClosingTemplate(settings.notifyClosingTemplate)
    setIncludedKeys(settings.notifyIncludedColumnKeys)
    setMailgunDomain(settings.mailgunDomain)
    setMailgunApiBase(settings.mailgunApiBase || "https://api.mailgun.net")
    setMailFrom(settings.mailFrom)
    setMailFromName(settings.mailFromName)
    setMailgunApiKeyMasked(settings.mailgunApiKeyMasked)
    setOrgMailConfigured(settings.orgMailConfigured)
    setWorkspaceMailConfigured(settings.workspaceMailConfigured)
    setFunnels(settings.funnels)
    setEmailColumns(settings.emailColumns)
    setPreview(settings.emailPreview)
    setMailgunApiKey("")
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/email-settings`, {
        cache: "no-store",
      })
      const data = (await response.json()) as { settings?: SettingsDto; error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientEmailLoadError"))
      applySettings(data.settings!)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("clientEmailLoadError"))
    } finally {
      setLoading(false)
    }
  }

  useAsyncEffect(() => {
    void load()
  }, [slug])

  const notifyFunnelIds = useMemo(
    () => funnels.filter((funnel) => funnel.notifyEnabled).map((funnel) => funnel.id),
    [funnels]
  )

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/email-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadNotifyEnabled,
          usePrimaryContact,
          extraNotifyEmails,
          notifySubjectTemplate,
          notifyIntroTemplate,
          notifyClosingTemplate,
          notifyIncludedColumnKeys: includedKeys,
          notifyFunnelIds,
          mailgunApiKey: mailgunApiKey.trim() || undefined,
          mailgunDomain,
          mailgunApiBase,
          mailFrom,
          mailFromName,
        }),
      })
      const data = (await response.json()) as { settings?: SettingsDto; error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientEmailSaveError"))
      applySettings(data.settings!)
      setNotice(t("clientEmailSaved"))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("clientEmailSaveError"))
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/email-settings/test`, {
        method: "POST",
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientEmailTestError"))
      setNotice(t("clientEmailTestOk"))
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : t("clientEmailTestError"))
    } finally {
      setTesting(false)
    }
  }

  function openWebhooksModal() {
    setWebhooksDraft([])
    setWebhooksOpen(true)
  }

  function applyWebhooksModal() {
    if (webhooksDraft.length === 0) {
      setWebhooksOpen(false)
      return
    }
    const add = new Set(webhooksDraft)
    setFunnels((current) =>
      current.map((funnel) =>
        add.has(funnel.id) ? { ...funnel, notifyEnabled: true } : funnel
      )
    )
    setWebhooksOpen(false)
  }

  function confirmRemoveFunnel() {
    if (!removeFunnelTarget) return
    const id = removeFunnelTarget.id
    setFunnels((current) =>
      current.map((funnel) => (funnel.id === id ? { ...funnel, notifyEnabled: false } : funnel))
    )
    setRemoveFunnelTarget(null)
  }

  function openFieldsModal() {
    setFieldsDraft([...includedKeys])
    setFieldsOpen(true)
  }

  function applyFieldsModal() {
    setIncludedKeys([...fieldsDraft])
    setFieldsOpen(false)
  }

  const mailBadge = orgMailConfigured
    ? t("clientEmailMailgunOrgBadge")
    : workspaceMailConfigured
      ? t("clientEmailMailgunWorkspaceBadge")
      : null

  const sectionsDisabled = !leadNotifyEnabled

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("clientEmailTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("clientEmailIntro")}</p>
      </header>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <>
          <p className="sr-only">{t("loading")}</p>
          <EmailSettingsPanelSkeleton />
        </>
      ) : (
        <>
      <section className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">{t("clientEmailMasterLabel")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={leadNotifyEnabled}
            onClick={() => setLeadNotifyEnabled((value) => !value)}
            className={cn(
              "relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
              leadNotifyEnabled ? "bg-primary" : "bg-[#d9cfc3]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                leadNotifyEnabled && "translate-x-4"
              )}
            />
          </button>
        </label>
        {!leadNotifyEnabled ? (
          <p className="text-xs text-muted-foreground">{t("clientEmailMasterHintOff")}</p>
        ) : null}
      </section>

      <section
        className={cn(adminSectionCardClass, "space-y-4 p-5", sectionsDisabled && "opacity-60")}
        aria-disabled={sectionsDisabled || undefined}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{t("clientEmailMailgunTitle")}</h2>
          {mailBadge ? (
            <p className="text-xs text-primary">{mailBadge}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("clientEmailMailgunWorkspaceHint")}</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">{t("integrationsMailgunDomain")}</span>
            <input
              className={inputClass}
              value={mailgunDomain}
              disabled={sectionsDisabled}
              onChange={(e) => setMailgunDomain(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">{t("integrationsMailgunApiKey")}</span>
            <input
              className={inputClass}
              type="password"
              autoComplete="off"
              placeholder={mailgunApiKeyMasked ?? ""}
              value={mailgunApiKey}
              disabled={sectionsDisabled}
              onChange={(e) => setMailgunApiKey(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{t("integrationsMailFrom")}</span>
            <input
              className={inputClass}
              value={mailFrom}
              disabled={sectionsDisabled}
              onChange={(e) => setMailFrom(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{t("integrationsMailFromName")}</span>
            <input
              className={inputClass}
              value={mailFromName}
              disabled={sectionsDisabled}
              onChange={(e) => setMailFromName(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section
        className={cn(adminSectionCardClass, "space-y-3 p-5", sectionsDisabled && "opacity-60")}
      >
        <h2 className="text-sm font-semibold text-foreground">{t("clientEmailRecipientsTitle")}</h2>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-[#d3c3b2]"
            checked={usePrimaryContact}
            disabled={sectionsDisabled}
            onChange={(e) => setUsePrimaryContact(e.target.checked)}
          />
          <span>
            {t("clientEmailUsePrimary")}
            {primaryContactEmail ? (
              <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                {primaryContactEmail}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-amber-800">
                {t("clientEmailPrimaryMissing")}
              </span>
            )}
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("clientEmailExtraLabel")}</span>
          <textarea
            className={cn(inputClass, "min-h-20 font-mono text-xs")}
            value={extraNotifyEmails}
            disabled={sectionsDisabled}
            onChange={(e) => setExtraNotifyEmails(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">{t("clientEmailExtraHint")}</span>
        </label>
      </section>

      <section
        className={cn(adminSectionCardClass, "space-y-3 p-5", sectionsDisabled && "opacity-60")}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("clientEmailWebhooksTitle")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            disabled={sectionsDisabled || funnels.length === 0}
            onClick={openWebhooksModal}
          >
            {t("clientEmailWebhooksAddButton")}
          </Button>
        </div>
        {funnels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("clientEmailWebhooksEmpty")}</p>
        ) : selectedFunnels.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#d3c3b2] bg-[#faf8f6] px-3 py-3 text-sm text-muted-foreground">
            {t("clientEmailWebhooksNoneSelected")}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {selectedFunnels.map((funnel) => (
              <li key={funnel.id}>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d3c3b2] bg-[#faf8f6] py-1.5 pr-1.5 pl-3.5 text-sm font-medium text-foreground">
                  <span className="truncate">{funnel.name}</span>
                  <button
                    type="button"
                    disabled={sectionsDisabled}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={t("clientEmailWebhooksRemoveConfirm")}
                    onClick={() => setRemoveFunnelTarget(funnel)}
                  >
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cn(adminSectionCardClass, "space-y-4 p-5", sectionsDisabled && "opacity-60")}
      >
        <h2 className="text-sm font-semibold text-foreground">{t("clientEmailContentTitle")}</h2>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("clientEmailSubjectLabel")}</span>
          <input
            className={inputClass}
            value={notifySubjectTemplate}
            disabled={sectionsDisabled}
            onChange={(e) => setNotifySubjectTemplate(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">{t("clientEmailSubjectHint")}</span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("clientEmailIntroLabel")}</span>
          <textarea
            className={cn(inputClass, "min-h-16")}
            value={notifyIntroTemplate}
            disabled={sectionsDisabled}
            onChange={(e) => setNotifyIntroTemplate(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={adminOutlineButtonClass}
          disabled={sectionsDisabled}
          onClick={openFieldsModal}
        >
          {t("clientEmailFieldsButton")}
        </Button>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("clientEmailClosingLabel")}</span>
          <textarea
            className={cn(inputClass, "min-h-20")}
            value={notifyClosingTemplate}
            disabled={sectionsDisabled}
            onChange={(e) => setNotifyClosingTemplate(e.target.value)}
          />
        </label>
      </section>

      {preview ? (
        <section
          className={cn(
            adminSectionCardClass,
            "space-y-3 p-5 text-sm",
            sectionsDisabled && "opacity-60"
          )}
        >
          <h2 className="font-semibold text-foreground">{t("clientEmailPreviewTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("clientEmailPreviewValuesHint")}</p>
          <div className="rounded-lg border border-[#e8e0d8] bg-[#faf8f6] p-4 font-mono text-xs leading-relaxed">
            <p className="font-semibold text-foreground">Emne: {preview.subjectExample}</p>
            <p className="mt-3 whitespace-pre-wrap text-foreground">{preview.intro}</p>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {emailColumns
                .filter((column) => includedKeys.includes(column.key))
                .map((column) => (
                  <li key={column.key}>
                    {column.labelDa}: …
                  </li>
                ))}
            </ul>
            <p className="mt-3 whitespace-pre-wrap text-foreground">{preview.closing}</p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("clientEmailSave")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={adminOutlineButtonClass}
          disabled={testing || sectionsDisabled}
          onClick={() => void sendTest()}
        >
          {testing ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("clientEmailTest")}
        </Button>
      </div>

      {webhooksOpen ? (
        <ModalShell
          title={t("clientEmailWebhooksAddTitle")}
          subtitle={t("clientEmailWebhooksAddHint")}
          onClose={() => setWebhooksOpen(false)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setWebhooksOpen(false)}>
                {t("leadSheetCancel")}
              </Button>
              <Button
                type="button"
                disabled={webhooksDraft.length === 0}
                onClick={applyWebhooksModal}
              >
                {t("clientEmailWebhooksAddButton")}
              </Button>
            </>
          }
        >
          {funnelsAvailableToAdd.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("clientEmailWebhooksAddEmpty")}</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {funnelsAvailableToAdd.map((funnel) => {
                const checked = webhooksDraft.includes(funnel.id)
                return (
                  <li key={funnel.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e8e0d8] bg-white px-3 py-2.5 text-sm transition-colors hover:bg-[#faf8f6]">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-[#d3c3b2]"
                        checked={checked}
                        onChange={(e) => {
                          setWebhooksDraft((current) => {
                            if (e.target.checked) {
                              return current.includes(funnel.id)
                                ? current
                                : [...current, funnel.id]
                            }
                            return current.filter((id) => id !== funnel.id)
                          })
                        }}
                      />
                      <span className="font-medium text-foreground">{funnel.name}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </ModalShell>
      ) : null}

      {removeFunnelTarget ? (
        <ConfirmDialog
          title={t("clientEmailWebhooksRemoveTitle")}
          message={t("clientEmailWebhooksRemoveMessage").replace(
            "{name}",
            removeFunnelTarget.name
          )}
          confirmLabel={t("clientEmailWebhooksRemoveConfirm")}
          destructive
          onClose={() => setRemoveFunnelTarget(null)}
          onConfirm={confirmRemoveFunnel}
        />
      ) : null}

      {fieldsOpen ? (
        <ModalShell
          title={t("clientEmailFieldsTitle")}
          subtitle={t("clientEmailFieldsHint")}
          onClose={() => setFieldsOpen(false)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setFieldsOpen(false)}>
                {t("leadSheetCancel")}
              </Button>
              <Button type="button" onClick={applyFieldsModal}>
                {t("portalLoginDetailsDone")}
              </Button>
            </>
          }
        >
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminOutlineButtonClass}
              onClick={() => setFieldsDraft(emailColumns.map((column) => column.key))}
            >
              {t("clientEmailFieldsSelectAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminOutlineButtonClass}
              onClick={() => setFieldsDraft([])}
            >
              {t("clientEmailFieldsClearAll")}
            </Button>
          </div>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {emailColumns.map((column) => {
              const checked = fieldsDraft.includes(column.key)
              return (
                <li key={column.key}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[#d3c3b2]"
                      checked={checked}
                      onChange={(e) => {
                        setFieldsDraft((current) => {
                          if (e.target.checked) {
                            return current.includes(column.key)
                              ? current
                              : [...current, column.key]
                          }
                          return current.filter((key) => key !== column.key)
                        })
                      }}
                    />
                    <span>{column.labelDa}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </ModalShell>
      ) : null}
        </>
      )}
    </div>
  )
}
