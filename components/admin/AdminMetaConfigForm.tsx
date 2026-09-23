"use client"

import { FormEvent, useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

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

export function AdminMetaConfigForm({
  slug,
  initialConfig,
  onSaved,
}: {
  slug: string
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
      const data = (await response.json()) as { error?: string; config?: MetaConfig }
      if (!response.ok) throw new Error(data.error ?? t("errorSaveMeta"))
      if (data.config) setConfig(toMetaConfig(data.config))
      setMessage(t("metaSetupSaved"))
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
        metrics?: { success?: boolean; reason?: string; monthCount?: number }
        leads?: { imported?: number; scanned?: number; reason?: string }
      }
      if (!response.ok) throw new Error(data.error ?? t("syncFailed"))

      const parts = []
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
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("metaSetupTitle")}</CardTitle>
        <CardDescription>{t("metaSetupDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-live="polite">
            <p className="sr-only">{t("loading")}</p>
            <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
            <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
            <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-16 animate-pulse rounded-[15px] bg-muted" />
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-28 animate-pulse rounded-[10px] bg-muted" />
              <div className="h-10 w-32 animate-pulse rounded-[10px] bg-muted" />
              <div className="h-10 w-24 animate-pulse rounded-[10px] bg-muted" />
            </div>
          </div>
        ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("metaAdAccountId")}</span>
            <input
              className={fieldClass}
              value={config.metaAdAccountId}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  metaAdAccountId: event.target.value,
                }))
              }
              placeholder={t("metaAdAccountPlaceholder")}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("metaPageId")}</span>
            <input
              className={fieldClass}
              value={config.metaPageId}
              onChange={(event) =>
                setConfig((current) => ({ ...current, metaPageId: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("metaPixelId")}</span>
            <input
              className={fieldClass}
              value={config.metaPixelId}
              onChange={(event) =>
                setConfig((current) => ({ ...current, metaPixelId: event.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) =>
                setConfig((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            {t("metaEnabledForClient")}
          </label>
          <div className="rounded-[15px] bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
            <p>
              {t("syncStatus")} {config.metaSyncStatus}
            </p>
            <p>
              {t("lastSynced")} {formatTimestamp(config.metaLastSyncedAt)}
            </p>
            {config.metaSyncError ? (
              <p className="mt-1 text-destructive">{config.metaSyncError}</p>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10" disabled={saving || loading}>
              {saving ? t("saving") : t("saveMetaSetup")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={testing || loading}
              onClick={() => {
                void handleTestConnection()
              }}
            >
              {testing ? t("testing") : t("testConnection")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={syncing || loading}
              onClick={() => {
                void handleSyncNow()
              }}
            >
              {syncing ? t("syncing") : t("syncNow")}
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  )
}
