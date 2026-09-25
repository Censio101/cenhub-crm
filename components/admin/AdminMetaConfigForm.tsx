"use client"

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react"
import {
  AppWindowIcon,
  CircleDotIcon,
  MegaphoneIcon,
  PlugZapIcon,
  RefreshCwIcon,
  SaveIcon,
  ScanLineIcon,
} from "lucide-react"

import type { MetaPartnerAccountSelection } from "@/components/admin/MetaPartnerAccountPicker"
import {
  MetaPartnerLinkPanel,
  type LinkedMetaDisplay,
} from "@/components/admin/MetaPartnerLinkPanel"
import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export type MetaConfig = {
  metaAdAccountId: string
  metaPageId: string
  metaPixelId: string
  enabled: boolean
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
}

const emptyMetaConfig: MetaConfig = {
  metaAdAccountId: "",
  metaPageId: "",
  metaPixelId: "",
  enabled: false,
  metaSyncStatus: "disabled",
  metaSyncError: null,
  metaLastSyncedAt: null,
}

function toMetaConfig(
  config: Partial<MetaConfig> & { organizationId?: string } | null | undefined
): MetaConfig {
  if (!config) return emptyMetaConfig
  return {
    metaAdAccountId: config.metaAdAccountId ?? "",
    metaPageId: config.metaPageId ?? "",
    metaPixelId: config.metaPixelId ?? "",
    enabled: Boolean(config.enabled),
    metaSyncStatus: config.metaSyncStatus ?? "disabled",
    metaSyncError: config.metaSyncError ?? null,
    metaLastSyncedAt: config.metaLastSyncedAt ?? null,
  }
}

function MetaToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-[#d3c3b2]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

function MetaField({
  icon,
  tone,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: ReactNode
  tone: "brand" | "blue" | "violet" | "neutral"
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <span className={adminIconBoxClass(tone)} aria-hidden="true">
          {icon}
        </span>
        <span className="text-[14px] font-semibold text-foreground">{label}</span>
      </div>
      <input
        className={adminFieldClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function AdminMetaConfigForm({
  slug,
  organizationName,
  initialConfig,
  onSaved,
}: {
  slug: string
  organizationName?: string
  initialConfig?: MetaConfig | null
  onSaved?: () => void
}) {
  const { t, locale } = useLanguage()
  const [config, setConfig] = useState<MetaConfig>(() => toMetaConfig(initialConfig))
  const [loading, setLoading] = useState(initialConfig === undefined)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [partnerSelection, setPartnerSelection] = useState<MetaPartnerAccountSelection>(null)
  const [linkedPartnerName, setLinkedPartnerName] = useState<string | null>(null)

  const dismissMessage = useCallback(() => setMessage(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(message, dismissMessage)
  useAutoDismiss(error, dismissError, 6000)

  function formatTimestamp(value: string | null) {
    if (!value) return t("never")
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString(locale === "da" ? "da-DK" : "en-GB")
  }

  async function loadConfig() {
    const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
      cache: "no-store",
    })
    if (!response.ok) return null
    const data = (await response.json()) as { config?: MetaConfig & { organizationId?: string } }
    const next = toMetaConfig(data.config)
    setConfig(next)
    return next
  }

  useEffect(() => {
    if (initialConfig !== undefined) {
      setConfig(toMetaConfig(initialConfig))
      setLoading(false)
      return
    }

    void loadConfig().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialConfig])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = (await response.json()) as {
        error?: string
        config?: MetaConfig
        onboard?: { adAccountDiscovered?: boolean; pageIdDiscovered?: boolean }
      }
      if (!response.ok) throw new Error(data.error ?? t("errorSaveMeta"))
      if (data.config) setConfig(toMetaConfig(data.config))

      let message = t("metaSetupSaved")
      if (data.onboard?.adAccountDiscovered) {
        message += ` ${t("metaAdAccountDiscovered")}`
      }
      if (data.onboard?.pageIdDiscovered) {
        message += t("onboardPageFound")
      } else if (data.config?.enabled && !data.config.metaPageId?.trim()) {
        message += t("onboardAddPageId")
      }
      setMessage(message.trim())
      onSaved?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("errorSaveMeta"))
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/test`, {
        method: "POST",
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? t("connectionFailed"))
      }
      setMessage(data.message ?? t("connectionOk"))
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : t("connectionFailed"))
    } finally {
      setTesting(false)
    }
  }

  async function handleSyncNow() {
    setSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      })
      const data = (await response.json()) as {
        error?: string
        ensured?: { adAccountDiscovered?: boolean; pageIdDiscovered?: boolean }
        metrics?: { success?: boolean; reason?: string; monthCount?: number }
        leads?: { imported?: number; scanned?: number; reason?: string }
      }
      if (!response.ok) throw new Error(data.error ?? t("syncFailed"))

      const parts = []
      if (data.ensured?.adAccountDiscovered) {
        parts.push(t("metaAdAccountDiscovered"))
      }
      if (data.ensured?.pageIdDiscovered) {
        parts.push(t("onboardPageFound"))
      }
      if (data.metrics?.success) {
        parts.push(t("adSpendSynced", { months: data.metrics.monthCount ?? 0 }))
      } else if (data.metrics?.reason) {
        parts.push(t("adSpendFailed", { reason: data.metrics.reason }))
      }
      if (typeof data.leads?.imported === "number") {
        parts.push(
          t("leadsSynced", {
            imported: data.leads.imported,
            scanned: data.leads.scanned ?? 0,
          })
        )
      } else if (data.leads?.reason) {
        parts.push(t("leadsFailed", { reason: data.leads.reason }))
      }

      setMessage(parts.join(" · ") || t("syncComplete"))
      await loadConfig()
      onSaved?.()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncing(false)
    }
  }

  const syncStatusTone =
    config.metaSyncStatus === "ok"
      ? "text-emerald-700"
      : config.metaSyncStatus === "error"
        ? "text-red-700"
        : "text-muted-foreground"

  const linkedMetaDisplay: LinkedMetaDisplay = config.metaAdAccountId.trim()
    ? {
        metaAdAccountId: config.metaAdAccountId,
        accountName:
          linkedPartnerName?.trim() ||
          organizationName?.trim() ||
          config.metaAdAccountId,
      }
    : null

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5 sm:px-6">
        <span className={adminIconBoxClass("brand")} aria-hidden="true">
          <CircleDotIcon className="size-[18px]" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{t("metaSetupTitle")}</h2>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-live="polite">
            <p className="sr-only">{t("loading")}</p>
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="rounded-xl border border-[#d3c3b2] bg-[#faf8f6]/50 px-4 py-4">
              <MetaPartnerLinkPanel
                mode="linked"
                organizationSlug={slug}
                suggestName={organizationName ?? ""}
                linkedAccount={linkedMetaDisplay}
                draftSelection={partnerSelection}
                onDraftSelectionChange={setPartnerSelection}
                disabled={saving}
                onLinked={() => {
                  void loadConfig().then(() => onSaved?.())
                }}
                onLinkSuccess={(text) => {
                  setMessage(text)
                  setError(null)
                }}
                onLinkError={setError}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d3c3b2] bg-white px-4 py-3">
              <p className="text-[14px] font-semibold text-foreground">
                {t("metaEnabledForClient")}
              </p>
              <MetaToggle
                checked={config.enabled}
                label={t("metaEnabledForClient")}
                onChange={(enabled) => setConfig((current) => ({ ...current, enabled }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetaField
                tone="brand"
                icon={<MegaphoneIcon className="size-[18px]" />}
                label={t("metaAdAccountId")}
                placeholder={t("metaAdAccountPlaceholder")}
                value={config.metaAdAccountId}
                onChange={(metaAdAccountId) =>
                  setConfig((current) => ({ ...current, metaAdAccountId }))
                }
              />
              <MetaField
                tone="blue"
                icon={<AppWindowIcon className="size-[18px]" />}
                label={t("metaPageId")}
                value={config.metaPageId}
                onChange={(metaPageId) => setConfig((current) => ({ ...current, metaPageId }))}
              />
            </div>

            <MetaField
              tone="violet"
              icon={<ScanLineIcon className="size-[18px]" />}
              label={t("metaPixelId")}
              value={config.metaPixelId}
              onChange={(metaPixelId) => setConfig((current) => ({ ...current, metaPixelId }))}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  {t("syncStatus")}
                </p>
                <p className={cn("mt-0.5 text-[14px] font-semibold capitalize", syncStatusTone)}>
                  {config.metaSyncStatus}
                </p>
              </div>
              <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  {t("lastSynced")}
                </p>
                <p className="mt-0.5 text-[14px] font-semibold text-foreground">
                  {formatTimestamp(config.metaLastSyncedAt)}
                </p>
              </div>
            </div>

            {config.metaSyncError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                {config.metaSyncError}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800" role="status">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-[#e8e0d8] pt-4">
              <Button type="submit" className="h-10 gap-2 px-4" disabled={saving || loading}>
                <SaveIcon className="size-4" aria-hidden="true" />
                {saving ? t("saving") : t("saveMetaSetup")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 border-[#d3c3b2] bg-white px-4"
                disabled={testing || loading}
                onClick={() => {
                  void handleTestConnection()
                }}
              >
                <PlugZapIcon className="size-4" aria-hidden="true" />
                {testing ? t("testing") : t("testConnection")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 border-[#d3c3b2] bg-white px-4"
                disabled={syncing || loading}
                onClick={() => {
                  void handleSyncNow()
                }}
              >
                <RefreshCwIcon
                  className={cn("size-4", syncing && "animate-spin")}
                  aria-hidden="true"
                />
                {syncing ? t("syncing") : t("syncNow")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
