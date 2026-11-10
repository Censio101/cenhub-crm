"use client"

import { useMemo, useRef, useState } from "react"
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

type DeliveryRow = {
  id: string
  leadId: string | null
  funnelName: string | null
  leadName: string
  recipients: string[]
  status: "sent" | "skipped" | "failed"
  skipReason: string | null
  errorMessage: string | null
  mailgunMessageId: string | null
  createdAt: string
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
  workspaceMailgunDomain: string
  workspaceMailFrom: string
  workspaceMailFromName: string
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

const EMAIL_HISTORY_PAGE_SIZE = 10

function EmailSettingsPanelSkeleton() {
  return (
    <div className="contents" aria-busy="true">
      <div className={cn(adminSectionCardClass, "flex items-center justify-between gap-3 p-5")}>
        <div className="skeleton-shimmer h-5 w-44 rounded-md" />
        <div className="skeleton-shimmer h-6 w-10 shrink-0 rounded-full" />
      </div>
      <div className={cn(adminSectionCardClass, "space-y-3 p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton-shimmer h-5 w-20 rounded-md" />
          <div className="skeleton-shimmer h-7 w-28 rounded-full" />
        </div>
        <div className="skeleton-shimmer h-8 w-56 max-w-full rounded-full" />
        <div className="skeleton-shimmer h-3 w-40 rounded-md" />
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
  const [workspaceMailgunDomain, setWorkspaceMailgunDomain] = useState("")
  const [workspaceMailFrom, setWorkspaceMailFrom] = useState("")
  const [workspaceMailFromName, setWorkspaceMailFromName] = useState("")
  const [mailgunMode, setMailgunMode] = useState<"workspace" | "organization">("workspace")
  const [mailgunModalOpen, setMailgunModalOpen] = useState(false)
  const [mailgunModalMode, setMailgunModalMode] = useState<"workspace" | "organization">("workspace")
  const [mailgunModalDomain, setMailgunModalDomain] = useState("")
  const [mailgunModalApiKey, setMailgunModalApiKey] = useState("")
  const [mailgunModalApiBase, setMailgunModalApiBase] = useState("https://api.mailgun.net")
  const [mailgunModalFrom, setMailgunModalFrom] = useState("")
  const [mailgunModalFromName, setMailgunModalFromName] = useState("")
  const [funnels, setFunnels] = useState<FunnelRow[]>([])
  const [emailColumns, setEmailColumns] = useState<EmailColumn[]>([])
  const [preview, setPreview] = useState<SettingsDto["emailPreview"] | null>(null)

  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [fieldsDraft, setFieldsDraft] = useState<string[]>([])
  const [webhooksOpen, setWebhooksOpen] = useState(false)
  const [webhooksDraft, setWebhooksDraft] = useState<string[]>([])
  const [removeFunnelTarget, setRemoveFunnelTarget] = useState<FunnelRow | null>(null)
  const [emailTab, setEmailTab] = useState<"settings" | "history">("settings")
  const emailTabBarRef = useRef<HTMLDivElement>(null)
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null)
  const [deliveriesPage, setDeliveriesPage] = useState(1)
  const [deliveriesTotal, setDeliveriesTotal] = useState(0)
  const [deliveriesTotalPages, setDeliveriesTotalPages] = useState(1)
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  const [resendingLeadId, setResendingLeadId] = useState<string | null>(null)

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
    setWorkspaceMailgunDomain(settings.workspaceMailgunDomain)
    setWorkspaceMailFrom(settings.workspaceMailFrom)
    setWorkspaceMailFromName(settings.workspaceMailFromName)
    setMailgunMode(settings.orgMailConfigured ? "organization" : "workspace")
    setFunnels(settings.funnels)
    setEmailColumns(settings.emailColumns)
    setPreview(settings.emailPreview)
    setMailgunApiKey("")
  }

  async function loadDeliveries(page = deliveriesPage) {
    setDeliveriesError(null)
    setDeliveriesLoading(true)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/lead-notify-deliveries?page=${page}&pageSize=${EMAIL_HISTORY_PAGE_SIZE}`,
        { cache: "no-store" }
      )
      const data = (await response.json()) as {
        deliveries?: {
          id: string
          lead_id: string | null
          funnel_name: string | null
          lead_name: string
          recipients: string[]
          status: DeliveryRow["status"]
          skip_reason: string | null
          error_message: string | null
          mailgun_message_id: string | null
          created_at: string
        }[]
        page?: number
        total?: number
        totalPages?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? t("clientEmailDeliveriesLoadError"))
      setDeliveries(
        (data.deliveries ?? []).map((row) => ({
          id: row.id,
          leadId: row.lead_id,
          funnelName: row.funnel_name,
          leadName: row.lead_name,
          recipients: row.recipients,
          status: row.status,
          skipReason: row.skip_reason,
          errorMessage: row.error_message,
          mailgunMessageId: row.mailgun_message_id,
          createdAt: row.created_at,
        }))
      )
      setDeliveriesPage(data.page ?? page)
      setDeliveriesTotal(data.total ?? 0)
      setDeliveriesTotalPages(data.totalPages ?? 1)
    } catch (loadError) {
      setDeliveriesError(
        loadError instanceof Error ? loadError.message : t("clientEmailDeliveriesLoadError")
      )
    } finally {
      setDeliveriesLoading(false)
    }
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [settingsRes] = await Promise.all([
        fetch(`/api/admin/organizations/${slug}/email-settings`, { cache: "no-store" }),
        loadDeliveries(),
      ])
      const data = (await settingsRes.json()) as { settings?: SettingsDto; error?: string }
      if (!settingsRes.ok) throw new Error(data.error ?? t("clientEmailLoadError"))
      applySettings(data.settings!)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("clientEmailLoadError"))
    } finally {
      setLoading(false)
    }
  }

  function formatDeliveryTime(iso: string): string {
    try {
      return new Intl.DateTimeFormat("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Copenhagen",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  function deliveryDayKey(iso: string): string {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Copenhagen",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso))
    } catch {
      return iso.slice(0, 10)
    }
  }

  function deliveryDayLabel(iso: string): string {
    const key = deliveryDayKey(iso)
    const today = deliveryDayKey(new Date().toISOString())
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = deliveryDayKey(yesterdayDate.toISOString())
    if (key === today) return t("clientEmailDeliveriesToday")
    if (key === yesterday) return t("clientEmailDeliveriesYesterday")
    try {
      return new Intl.DateTimeFormat("da-DK", {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: "Europe/Copenhagen",
      }).format(new Date(iso))
    } catch {
      return key
    }
  }

  const deliveryGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: DeliveryRow[] }[] = []
    for (const row of deliveries) {
      const key = deliveryDayKey(row.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.rows.push(row)
      } else {
        groups.push({ key, label: deliveryDayLabel(row.createdAt), rows: [row] })
      }
    }
    return groups
  }, [deliveries, t])

  function deliveryDetail(row: DeliveryRow): string {
    if (row.status === "failed") return row.errorMessage ?? "—"
    if (row.status === "sent" && row.mailgunMessageId) return row.mailgunMessageId
    if (row.skipReason) {
      switch (row.skipReason) {
        case "notify_disabled":
          return t("clientEmailDeliverySkip_notify_disabled")
        case "funnel_not_selected":
          return t("clientEmailDeliverySkip_funnel_not_selected")
        case "no_recipients":
          return t("clientEmailDeliverySkip_no_recipients")
        case "mailgun_missing":
          return t("clientEmailDeliverySkip_mailgun_missing")
        case "no_sheet":
          return t("clientEmailDeliverySkip_no_sheet")
        case "duplicate_lead":
          return t("clientEmailDeliverySkip_duplicate_lead")
        case "stepped_form_disabled":
          return t("clientEmailDeliverySkip_stepped_form_disabled")
        case "step_merge":
          return t("clientEmailDeliverySkip_step_merge")
        default:
          return row.skipReason
      }
    }
    return "—"
  }

  function deliveryStatusLabel(status: DeliveryRow["status"]): string {
    if (status === "sent") return t("clientEmailDeliveryStatusSent")
    if (status === "failed") return t("clientEmailDeliveryStatusFailed")
    return t("clientEmailDeliveryStatusSkipped")
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
          ...(mailgunMode === "workspace"
            ? {
                mailgunApiKey: null,
                mailgunDomain: "",
                mailgunApiBase: "https://api.mailgun.net",
                mailFrom: "",
                mailFromName: "",
              }
            : {
                mailgunApiKey: mailgunApiKey.trim() || undefined,
                mailgunDomain,
                mailgunApiBase,
                mailFrom,
                mailFromName,
              }),
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

  async function resendLeadNotify(leadId: string) {
    setResendingLeadId(leadId)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/leads/${leadId}/resend-notify`,
        { method: "POST" }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientEmailDeliveryResendError"))
      setNotice(t("clientEmailDeliveryResendOk"))
      await loadDeliveries(deliveriesPage)
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : t("clientEmailDeliveryResendError")
      )
    } finally {
      setResendingLeadId(null)
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

  function openMailgunModal() {
    setMailgunModalMode(mailgunMode)
    setMailgunModalDomain(mailgunDomain)
    setMailgunModalApiKey("")
    setMailgunModalApiBase(mailgunApiBase || "https://api.mailgun.net")
    setMailgunModalFrom(mailFrom)
    setMailgunModalFromName(mailFromName)
    setMailgunModalOpen(true)
  }

  function applyMailgunModal() {
    setMailgunMode(mailgunModalMode)
    if (mailgunModalMode === "organization") {
      setMailgunDomain(mailgunModalDomain)
      if (mailgunModalApiKey.trim()) setMailgunApiKey(mailgunModalApiKey)
      setMailgunApiBase(mailgunModalApiBase)
      setMailFrom(mailgunModalFrom)
      setMailFromName(mailgunModalFromName)
    }
    setMailgunModalOpen(false)
  }

  const mailgunUsesWorkspace = mailgunMode === "workspace"
  const activeFromEmail = mailgunUsesWorkspace ? workspaceMailFrom : mailFrom
  const activeFromName = mailgunUsesWorkspace ? workspaceMailFromName : mailFromName
  const mailgunNotReady = mailgunUsesWorkspace && !workspaceMailConfigured

  const sectionsDisabled = !leadNotifyEnabled

  function selectEmailTab(next: "settings" | "history") {
    const before = emailTabBarRef.current?.getBoundingClientRect().top ?? 0
    setEmailTab(next)
    requestAnimationFrame(() => {
      const bar = emailTabBarRef.current
      if (!bar) return
      const delta = bar.getBoundingClientRect().top - before
      if (Math.abs(delta) > 1) window.scrollBy(0, delta)
    })
  }

  return (
    <div className="mx-auto grid w-full gap-6">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("clientEmailTitle")}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("clientEmailIntro")}
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}

        <div ref={emailTabBarRef} className="border-b border-[#e8e0d8]">
          <nav role="tablist" className="flex gap-6">
            {(
              [
                { id: "settings" as const, label: t("clientEmailTabSettings") },
                { id: "history" as const, label: t("clientEmailTabHistory") },
              ] as const
            ).map((tab) => {
              const selected = emailTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectEmailTab(tab.id)}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-sm transition-colors",
                    selected
                      ? "border-foreground font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {loading ? (
        <>
          <p className="sr-only">{t("loading")}</p>
          <EmailSettingsPanelSkeleton />
        </>
      ) : emailTab === "settings" ? (
        <>
      <section className={cn(adminSectionCardClass, "divide-y divide-[#eee6de]")}>
        <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <span>
            <span className="block text-sm font-medium text-foreground">
              {t("clientEmailMasterLabel")}
            </span>
            {!leadNotifyEnabled ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("clientEmailMasterHintOff")}
              </span>
            ) : null}
          </span>
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

        <div
          className={cn(
            "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
            sectionsDisabled && "opacity-50"
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t("clientEmailMailgunFromLabel")}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {activeFromName ? `${activeFromName} · ` : ""}
              {activeFromEmail || "—"}
              {mailgunUsesWorkspace
                ? ` · ${t("clientEmailMailgunPillCensio")}`
                : ` · ${t("clientEmailMailgunPillClient")}`}
            </p>
            {mailgunNotReady ? (
              <p className="mt-2 text-xs text-amber-800">{t("clientEmailMailgunWorkspaceMissing")}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(adminOutlineButtonClass, "shrink-0 self-start")}
            disabled={sectionsDisabled}
            onClick={openMailgunModal}
          >
            {t("clientEmailMailgunChange")}
          </Button>
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
        </>
      ) : (
        <section className={cn(adminSectionCardClass, "overflow-hidden")}>
          <div className="flex items-end justify-between gap-3 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("clientEmailDeliveriesTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("clientEmailDeliveriesHint")}</p>
            </div>
            {deliveriesTotal > 0 ? (
              <p className="text-xs tabular-nums text-muted-foreground">
                {t("clientEmailDeliveriesPaginationSummary")
                  .replace(
                    "{from}",
                    String((deliveriesPage - 1) * EMAIL_HISTORY_PAGE_SIZE + 1)
                  )
                  .replace(
                    "{to}",
                    String(Math.min(deliveriesPage * EMAIL_HISTORY_PAGE_SIZE, deliveriesTotal))
                  )
                  .replace("{total}", String(deliveriesTotal))}
              </p>
            ) : null}
          </div>

          {deliveriesError ? (
            <p className="border-t border-[#eee6de] px-5 py-8 text-sm text-destructive sm:px-6">
              {deliveriesError}
            </p>
          ) : deliveriesLoading && deliveries.length === 0 ? (
            <div className="space-y-3 border-t border-[#eee6de] px-5 py-5 sm:px-6">
              <div className="skeleton-shimmer h-12 w-full rounded-lg" />
              <div className="skeleton-shimmer h-12 w-full rounded-lg" />
            </div>
          ) : deliveries.length === 0 ? (
            <p className="border-t border-[#eee6de] px-5 py-12 text-center text-sm text-muted-foreground sm:px-6">
              {t("clientEmailDeliveriesEmpty")}
            </p>
          ) : (
            <>
              {deliveryGroups.map((group) => (
                <div key={group.key}>
                  <p className="border-t border-[#eee6de] bg-[#faf8f6] px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground sm:px-6">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-[#eee6de]">
                    {group.rows.map((row) => {
                      const detail = deliveryDetail(row)
                      const showDetail = row.status !== "sent" && detail !== "—"
                      return (
                        <li
                          key={row.id}
                          className="grid gap-2 px-5 py-3.5 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6"
                        >
                          <time className="text-sm tabular-nums text-muted-foreground">
                            {formatDeliveryTime(row.createdAt)}
                          </time>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.leadName.trim() || "—"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {[row.funnelName?.trim(), row.recipients.join(", ")]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            {showDetail ? (
                              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-medium",
                                row.status === "sent" && "text-emerald-700",
                                row.status === "skipped" && "text-muted-foreground",
                                row.status === "failed" && "text-red-700"
                              )}
                              title={row.mailgunMessageId ?? undefined}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  row.status === "sent" && "bg-emerald-500",
                                  row.status === "skipped" && "bg-[#c4b5a5]",
                                  row.status === "failed" && "bg-red-500"
                                )}
                              />
                              {deliveryStatusLabel(row.status)}
                            </span>
                            {row.leadId ? (
                              <button
                                type="button"
                                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                                disabled={resendingLeadId === row.leadId}
                                onClick={() => void resendLeadNotify(row.leadId!)}
                              >
                                {resendingLeadId === row.leadId
                                  ? t("loading")
                                  : t("clientEmailDeliveryResend")}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}

              {deliveriesTotal > EMAIL_HISTORY_PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#eee6de] px-5 py-3 sm:px-6">
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                    disabled={deliveriesLoading || deliveriesPage <= 1}
                    onClick={() => void loadDeliveries(deliveriesPage - 1)}
                  >
                    {t("businessCategoriesPaginationPrev")}
                  </button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t("clientEmailDeliveriesPaginationPage")
                      .replace("{page}", String(deliveriesPage))
                      .replace("{pages}", String(deliveriesTotalPages))}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                    disabled={deliveriesLoading || deliveriesPage >= deliveriesTotalPages}
                    onClick={() => void loadDeliveries(deliveriesPage + 1)}
                  >
                    {t("businessCategoriesPaginationNext")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {mailgunModalOpen ? (
        <ModalShell
          title={t("clientEmailMailgunModalTitle")}
          subtitle={t("clientEmailMailgunModalHint")}
          onClose={() => setMailgunModalOpen(false)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setMailgunModalOpen(false)}>
                {t("leadSheetCancel")}
              </Button>
              <Button type="button" onClick={applyMailgunModal}>
                {t("clientEmailMailgunModalApply")}
              </Button>
            </>
          }
        >
          <fieldset className="grid gap-2">
            <legend className="sr-only">{t("clientEmailMailgunModalTitle")}</legend>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                mailgunModalMode === "workspace"
                  ? "border-foreground/20 bg-[#faf8f6]"
                  : "border-[#e8e0d8] bg-white hover:bg-[#faf8f6]"
              )}
            >
              <input
                type="radio"
                name="mailgunMode"
                className="mt-1 size-4 shrink-0"
                checked={mailgunModalMode === "workspace"}
                onChange={() => setMailgunModalMode("workspace")}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {t("clientEmailMailgunOptionWorkspace")}
                </span>
                {workspaceMailConfigured ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {workspaceMailFromName} · {workspaceMailFrom}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-amber-800">
                    {t("clientEmailMailgunWorkspaceMissing")}
                  </span>
                )}
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                mailgunModalMode === "organization"
                  ? "border-foreground/20 bg-[#faf8f6]"
                  : "border-[#e8e0d8] bg-white hover:bg-[#faf8f6]"
              )}
            >
              <input
                type="radio"
                name="mailgunMode"
                className="mt-1 size-4 shrink-0"
                checked={mailgunModalMode === "organization"}
                onChange={() => setMailgunModalMode("organization")}
              />
              <span className="text-sm font-medium text-foreground">
                {t("clientEmailMailgunOptionClient")}
              </span>
            </label>
          </fieldset>

          {mailgunModalMode === "organization" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">{t("integrationsMailgunDomain")}</span>
                <input
                  className={inputClass}
                  value={mailgunModalDomain}
                  onChange={(e) => setMailgunModalDomain(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">{t("integrationsMailgunApiKey")}</span>
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="off"
                  placeholder={mailgunApiKeyMasked ?? t("integrationsMailgunApiKeyPlaceholder")}
                  value={mailgunModalApiKey}
                  onChange={(e) => setMailgunModalApiKey(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">{t("integrationsMailgunRegion")}</span>
                <select
                  className={inputClass}
                  value={mailgunModalApiBase}
                  onChange={(e) => setMailgunModalApiBase(e.target.value)}
                >
                  <option value="https://api.mailgun.net">{t("integrationsMailgunRegionUs")}</option>
                  <option value="https://api.eu.mailgun.net">{t("integrationsMailgunRegionEu")}</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("integrationsMailFrom")}</span>
                <input
                  className={inputClass}
                  value={mailgunModalFrom}
                  onChange={(e) => setMailgunModalFrom(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("integrationsMailFromName")}</span>
                <input
                  className={inputClass}
                  value={mailgunModalFromName}
                  onChange={(e) => setMailgunModalFromName(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </ModalShell>
      ) : null}

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
    </div>
  )
}
