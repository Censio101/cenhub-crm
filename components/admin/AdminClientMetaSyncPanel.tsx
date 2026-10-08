"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDotIcon,
  RefreshCwIcon,
} from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import {
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import {
  isMetaMetricsStale,
  META_SYNC_LOG_RETENTION_DAYS,
} from "@/lib/meta/sync-center-constants"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "cn"

type SyncRun = {
  id: string
  status: string
  message: string | null
  started_at: string
}

export function AdminClientMetaSyncPanel() {
  const { slug, metaConfig, reload } = useAdminClient()
  const { t, locale } = useLanguage()
  const config = metaConfig
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)

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

  const loadRuns = useCallback(async () => {
    setRunsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/meta-sync/runs?slug=${encodeURIComponent(slug)}&days=${META_SYNC_LOG_RETENTION_DAYS}&limit=50`,
        { cache: "no-store", credentials: "include" }
      )
      if (!response.ok) return
      const json = (await response.json()) as { runs?: SyncRun[] }
      setRuns(json.runs ?? [])
    } finally {
      setRunsLoading(false)
    }
  }, [slug])

  useAsyncEffect(
    async (signal) => {
      await loadRuns()
      if (signal.cancelled) return
    },
    [loadRuns]
  )

  async function runSync(metricsRange: "maximum" | "ytd") {
    setSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scope: "metrics",
          metricsRange,
          source: "admin-client-meta-sync",
        }),
      })
      const data = (await response.json()) as {
        error?: string
        ensured?: { adAccountDiscovered?: boolean; pageIdDiscovered?: boolean }
        metrics?: { success?: boolean; reason?: string; monthCount?: number }
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

      setMessage(parts.join(" · ") || t("syncComplete"))
      await reload()
      await loadRuns()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncing(false)
    }
  }

  const syncStatusTone =
    config?.metaSyncStatus === "ok"
      ? "text-emerald-700"
      : config?.metaSyncStatus === "error"
        ? "text-red-700"
        : "text-muted-foreground"

  const stale =
    config?.metaLastSyncedAt != null && isMetaMetricsStale(config.metaLastSyncedAt)
  const neverSynced = !config?.metaLastSyncedAt?.trim()
  const canSync = Boolean(config?.enabled && config.metaAdAccountId?.trim())

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <RefreshCwIcon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground">{t("clientMetaSyncTitle")}</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {t("clientMetaSyncDescription")}
              </p>
            </div>
          </div>
          <Link
            href={adminClientSettingsSectionPath(slug, "meta")}
            className={cn(
              adminOutlineButtonClass,
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold"
            )}
          >
            <CircleDotIcon className="size-3.5" aria-hidden="true" />
            {t("clientMetaSyncGoToSetup")}
          </Link>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase">
                {t("syncStatus")}
              </p>
              <p
                className={cn("mt-0.5 text-[14px] font-semibold capitalize", syncStatusTone)}
              >
                {config?.metaSyncStatus ?? "—"}
              </p>
              {neverSynced ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#166FE5] ring-1 ring-blue-200/80">
                  {t("metaSyncBadgeNeverSynced")}
                </span>
              ) : stale ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                  {t("metaSyncBadgeStale")}
                </span>
              ) : null}
            </div>
            <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase">
                {t("lastSynced")}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-foreground">
                {formatTimestamp(config?.metaLastSyncedAt ?? null)}
              </p>
            </div>
          </div>

          {config?.metaSyncError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
              {config.metaSyncError}
            </p>
          ) : null}

          {!canSync ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
              {t("clientMetaSyncGoToSetup")} — {t("metaEnabledForClient")}
            </p>
          ) : null}

          {error ? (
            <p
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e8e0d8] pt-4">
            <Button
              type="button"
              className="h-10 gap-2 px-4"
              disabled={syncing || !canSync}
              onClick={() => {
                void runSync("maximum")
              }}
            >
              <RefreshCwIcon
                className={cn("size-4", syncing && "animate-spin")}
                aria-hidden="true"
              />
              {syncing ? t("syncing") : t("clientMetaSyncMetricsNow")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={syncing || !canSync}
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("h-10 gap-2 px-4", adminOutlineButtonClass)}
                  />
                }
              >
                {t("clientMetaSyncMetricsRange")}
                <ChevronDownIcon className="size-4 opacity-70" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[14rem]">
                <DropdownMenuItem
                  onClick={() => {
                    void runSync("maximum")
                  }}
                >
                  {t("metaSyncActionMetricsOnly")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void runSync("ytd")
                  }}
                >
                  {t("metaSyncActionMetricsYtd")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">{t("metaSyncScheduleMetrics")}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("clientMetaSyncLeadsHint")}{" "}
            <Link
              href={adminClientSettingsSectionPath(slug, "meta-instant-forms")}
              className="font-semibold text-primary hover:underline"
            >
              {t("clientNavMetaInstantForms")}
            </Link>
          </p>
          <Link
            href="/admin/meta-sync"
            className="mt-2 inline-block text-[13px] font-semibold text-primary hover:underline"
          >
            {t("clientMetaSyncWorkspaceCenter")}
          </Link>
        </div>
      </section>

      <details className={cn(adminSectionCardClass, "group overflow-hidden")}>
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-2 px-5 py-4 sm:px-6",
            "[&::-webkit-details-marker]:hidden"
          )}
        >
          <ChevronRightIcon
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[14px] font-semibold text-foreground">
              {t("metaSyncRunHistory")}
            </span>
            <span className="mt-0.5 block text-[12px] font-normal text-muted-foreground">
              {t("clientMetaSyncHistoryWindow", { days: META_SYNC_LOG_RETENTION_DAYS })}
            </span>
          </div>
        </summary>
        <div className="border-t border-[#e8e0d8] px-5 pb-4 sm:px-6">
          <ul className="mt-3 grid gap-2 text-[13px]">
            {runsLoading ? (
              <li className="space-y-2" aria-busy="true">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </li>
            ) : runs.length === 0 ? (
              <li className="text-muted-foreground">{t("clientMetaSyncHistoryEmpty")}</li>
            ) : (
              runs.map((run) => (
                <li
                  key={run.id}
                  className="rounded-lg bg-[#faf8f6] px-3 py-2"
                >
                  <p className="font-medium capitalize">{run.status}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTimestamp(run.started_at)}
                  </p>
                  {run.message ? (
                    <p className="mt-1 text-[12px] text-muted-foreground">{run.message}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </details>
    </div>
  )
}
