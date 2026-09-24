"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from "lucide-react"

import {
  adminFieldClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MessageKey } from "@/lib/i18n"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

type SyncFilter = "all" | "live" | "stale" | "needs-first-sync" | "error"

type OverviewClient = {
  organizationId: string
  slug: string
  name: string
  metaAdAccountId: string
  status: string
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
  stale: boolean
  neverSynced: boolean
  lastRun: {
    status: string
    message: string | null
    startedAt: string
  } | null
}

type OverviewBatch = {
  id: string
  source: string
  started_at: string
  finished_at: string | null
  summary: { synced: number; skipped: number; failed: number; total: number }
}

type OverviewPayload = {
  summary: {
    liveCount: number
    errorCount: number
    staleCount: number
    neverSyncedCount: number
  }
  schedule: { metricsCronUtc: string; leadsCronUtc: string }
  lastCronBatch: OverviewBatch | null
  batches: OverviewBatch[]
  clients: OverviewClient[]
}

type BatchRunRow = {
  id: string
  organization_id: string
  status: string
  message: string | null
  started_at: string
}

const FILTERS: SyncFilter[] = ["all", "live", "stale", "needs-first-sync", "error"]

const FILTER_LABELS: Record<SyncFilter, MessageKey> = {
  all: "metaSyncFilterAll",
  live: "metaSyncFilterLive",
  stale: "metaSyncFilterStale",
  "needs-first-sync": "metaSyncFilterNeedsFirstSync",
  error: "metaSyncFilterError",
}

function formatAdAccountShort(value: string) {
  const id = value.trim().replace(/^act_/i, "")
  if (!id) return "—"
  return id.length > 10 ? `…${id.slice(-8)}` : id
}

function relativeSyncTime(
  value: string | null,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
) {
  if (!value) return t("metaSyncRelativeNever")
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return value
  const diffMs = Date.now() - ms
  if (diffMs < 60_000) return t("metaSyncRelativeJustNow")
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return t("metaSyncRelativeMinutes", { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return t("metaSyncRelativeHours", { count: hours })
  const days = Math.floor(hours / 24)
  return t("metaSyncRelativeDays", { count: days })
}

function statusPillClass(status: string) {
  switch (status) {
    case "live":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
    case "error":
      return "bg-red-50 text-red-800 ring-red-200/80"
    case "needs-setup":
      return "bg-amber-50 text-amber-900 ring-amber-200/80"
    case "off":
      return "bg-muted text-muted-foreground ring-border"
    default:
      return "bg-muted text-muted-foreground ring-border"
  }
}

export function AdminMetaSyncCenter() {
  const { t, locale } = useLanguage()
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<SyncFilter>("all")
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const [batchRuns, setBatchRuns] = useState<BatchRunRow[]>([])
  const [batchRunsLoading, setBatchRunsLoading] = useState(false)
  const [historySlug, setHistorySlug] = useState<string | null>(null)
  const [historyRuns, setHistoryRuns] = useState<
    Array<{ status: string; message: string | null; started_at: string }>
  >([])

  useAutoDismiss(notice, useCallback(() => setNotice(null), []))
  useAutoDismiss(error, useCallback(() => setError(null), []), 8000)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/meta-sync/overview", {
        cache: "no-store",
        credentials: "include",
      })
      if (!response.ok) throw new Error(t("metaSyncLoadError"))
      const json = (await response.json()) as OverviewPayload
      setData(json)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("metaSyncLoadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const clients = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.clients.filter((client) => {
      if (filter === "live" && client.status !== "live") return false
      if (filter === "stale" && !client.stale) return false
      if (filter === "needs-first-sync" && !client.neverSynced) return false
      if (filter === "error" && client.status !== "error") return false
      if (!q) return true
      return (
        client.name.toLowerCase().includes(q) ||
        client.slug.toLowerCase().includes(q) ||
        client.metaAdAccountId.toLowerCase().includes(q)
      )
    })
  }, [data, filter, query])

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const client of data?.clients ?? []) {
      map.set(client.organizationId, client.name)
    }
    return map
  }, [data?.clients])

  async function handleSyncAll() {
    setSyncingAll(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/admin/meta-clients/sync-all", {
        method: "POST",
        credentials: "include",
      })
      const body = (await response.json()) as {
        error?: string
        summary?: { synced: number }
      }
      if (!response.ok) throw new Error(body.error ?? t("errorSyncAll"))
      await load()
      setNotice(t("facebookDataSynced", { count: body.summary?.synced ?? 0 }))
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("errorSyncAll"))
    } finally {
      setSyncingAll(false)
    }
  }

  async function runClientSync(
    slug: string,
    input: {
      scope: "metrics" | "leads" | "all"
      metricsRange?: "maximum" | "ytd"
    }
  ) {
    setSyncingSlug(slug)
    setError(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...input,
          source: "admin-sync-center",
        }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(body.error ?? t("syncFailed"))
      await load()
      setNotice(t("syncComplete"))
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncingSlug(null)
    }
  }

  async function toggleBatch(batchId: string) {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null)
      setBatchRuns([])
      return
    }
    setExpandedBatchId(batchId)
    setBatchRunsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/meta-sync/overview?batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store", credentials: "include" }
      )
      if (!response.ok) throw new Error(t("metaSyncLoadError"))
      const json = (await response.json()) as { batchRuns?: BatchRunRow[] }
      setBatchRuns(json.batchRuns ?? [])
    } catch {
      setBatchRuns([])
    } finally {
      setBatchRunsLoading(false)
    }
  }

  async function openHistory(slug: string) {
    setHistorySlug(slug)
    try {
      const response = await fetch(
        `/api/admin/meta-sync/runs?slug=${encodeURIComponent(slug)}&limit=10`,
        { cache: "no-store", credentials: "include" }
      )
      if (!response.ok) throw new Error(t("metaSyncLoadError"))
      const json = (await response.json()) as {
        runs: Array<{ status: string; message: string | null; started_at: string }>
      }
      setHistoryRuns(json.runs ?? [])
    } catch {
      setHistoryRuns([])
    }
  }

  function formatAbsolute(value: string | null) {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString(locale === "da" ? "da-DK" : "en-GB")
  }

  return (
    <div
      className={cn("admin-ui admin-meta-sync mx-auto flex w-full max-w-6xl flex-col gap-6")}
    >
      <header className={outfit.className}>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("brand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          {t("metaSyncTitle")}
        </h1>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="grid gap-4">
          <div className={cn(adminSectionCardClass, "h-24 animate-pulse bg-muted/40")} />
          <div className={cn(adminSectionCardClass, "h-64 animate-pulse bg-muted/40")} />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["metaSyncSummaryLive", data.summary.liveCount, "text-emerald-700"],
                ["metaSyncSummaryError", data.summary.errorCount, "text-red-700"],
                ["metaSyncSummaryStale", data.summary.staleCount, "text-amber-700"],
                [
                  "metaSyncSummaryNeverSynced",
                  data.summary.neverSyncedCount,
                  "text-muted-foreground",
                ],
              ] as const
            ).map(([labelKey, count, tone]) => (
              <div key={labelKey} className={cn(adminSectionCardClass, "px-4 py-3")}>
                <p className="text-[12px] font-medium leading-normal text-muted-foreground uppercase">
                  {t(labelKey)}
                </p>
                <p className={cn("mt-1 text-2xl font-semibold leading-normal tabular-nums", tone)}>
                  {count}
                </p>
              </div>
            ))}
          </div>

          <div className={cn(adminSectionCardClass)}>
            <div className="flex flex-col gap-3 border-b border-[#e8e0d8] px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
              <input
                className={cn(adminFieldClass, "max-w-md min-w-[200px] flex-1")}
                placeholder={t("metaSyncSearchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      filter === item
                        ? "bg-primary text-white"
                        : "bg-[#faf8f6] text-foreground/80 ring-1 ring-[#e8e0d8] hover:bg-[#f0ebe6]"
                    )}
                    onClick={() => setFilter(item)}
                  >
                    {t(FILTER_LABELS[item])}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button
                  type="button"
                  className="h-10 gap-2 px-4"
                  disabled={syncingAll}
                  onClick={() => {
                    void handleSyncAll()
                  }}
                >
                  <RefreshCwIcon
                    className={cn("size-4", syncingAll && "animate-spin")}
                    aria-hidden="true"
                  />
                  {syncingAll ? t("syncing") : t("syncAll")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-10 px-4", adminOutlineButtonClass)}
                  disabled={loading}
                  onClick={() => {
                    void load()
                  }}
                >
                  {t("refresh")}
                </Button>
              </div>
            </div>

            <div className="admin-meta-sync-table-wrap overflow-x-auto overflow-y-visible">
              <table className="admin-meta-sync-table w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e0d8] bg-[#faf8f6] text-[11px] font-semibold leading-normal tracking-wide text-muted-foreground uppercase">
                    <th className="px-5 py-3 align-middle">{t("metaSyncColClient")}</th>
                    <th className="px-3 py-3 align-middle">{t("metaSyncColStatus")}</th>
                    <th className="px-3 py-3 align-middle">{t("metaSyncColLastSynced")}</th>
                    <th className="px-3 py-3 align-middle">{t("metaSyncColLastRun")}</th>
                    <th className="px-5 py-3 text-right align-middle">{t("metaSyncSyncFromMeta")}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        {t("metaSyncNoClients")}
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => {
                      const busy = syncingSlug === client.slug
                      return (
                        <tr
                          key={client.organizationId}
                          className="border-b border-[#efe8e0] last:border-b-0"
                        >
                          <td className="px-5 py-3 align-top">
                            <div className="client-name text-[14px] font-semibold text-foreground">
                              {client.name}
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                              act_{formatAdAccountShort(client.metaAdAccountId)}
                            </div>
                            {client.metaSyncError ? (
                              <div
                                className="mt-1 truncate text-[11px] text-red-700"
                                title={client.metaSyncError}
                              >
                                {client.metaSyncError}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold leading-normal capitalize ring-1",
                                statusPillClass(client.status)
                              )}
                            >
                              {client.status}
                            </span>
                            {client.neverSynced ? (
                              <span className="ml-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold leading-normal text-[#166FE5] ring-1 ring-blue-200/80">
                                {t("metaSyncBadgeNeverSynced")}
                              </span>
                            ) : client.stale ? (
                              <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-normal text-amber-900 ring-1 ring-amber-200/80">
                                {t("metaSyncBadgeStale")}
                              </span>
                            ) : null}
                          </td>
                          <td
                            className="px-3 py-3 align-middle"
                            title={formatAbsolute(client.metaLastSyncedAt)}
                          >
                            {relativeSyncTime(client.metaLastSyncedAt, t)}
                          </td>
                          <td
                            className="px-3 py-3 align-middle capitalize"
                            title={
                              client.lastRun
                                ? formatAbsolute(client.lastRun.startedAt)
                                : undefined
                            }
                          >
                            {client.lastRun
                              ? `${client.lastRun.status} · ${relativeSyncTime(client.lastRun.startedAt, t)}`
                              : "—"}
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn("h-8 text-[12px]", adminOutlineButtonClass)}
                                onClick={() => {
                                  void openHistory(client.slug)
                                }}
                              >
                                {t("metaSyncRunHistory")}
                              </Button>
                              <Link
                                href={`/admin/${client.slug}/meta`}
                                className={cn(
                                  adminOutlineButtonClass,
                                  "inline-flex h-8 items-center rounded-md px-2.5 text-[12px] font-semibold"
                                )}
                              >
                                {t("metaSyncOpenMetaSetup")}
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  aria-label={t("metaSyncSyncFromMeta")}
                                  disabled={busy || !client.metaAdAccountId}
                                  render={
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className={cn("size-8", adminOutlineButtonClass)}
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon
                                    className={cn("size-4", busy && "animate-spin")}
                                  />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[14rem]">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void runClientSync(client.slug, {
                                        scope: "all",
                                        metricsRange: "maximum",
                                      })
                                    }}
                                  >
                                    {t("metaSyncActionFull")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void runClientSync(client.slug, {
                                        scope: "metrics",
                                        metricsRange: "maximum",
                                      })
                                    }}
                                  >
                                    {t("metaSyncActionMetricsOnly")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void runClientSync(client.slug, {
                                        scope: "metrics",
                                        metricsRange: "ytd",
                                      })
                                    }}
                                  >
                                    {t("metaSyncActionMetricsYtd")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void runClientSync(client.slug, { scope: "leads" })
                                    }}
                                  >
                                    {t("metaSyncActionLeadsOnly")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cn(adminSectionCardClass, "px-5 py-4 sm:px-6")}>
            <h2 className="text-[14px] font-semibold leading-normal text-foreground">
              {t("metaSyncRecentBatches")}
            </h2>
            <ul className="mt-2 grid gap-2">
              {data.batches.length === 0 ? (
                <li className="text-[13px] text-muted-foreground">—</li>
              ) : (
                data.batches.map((batch) => {
                  const expanded = expandedBatchId === batch.id
                  return (
                    <li
                      key={batch.id}
                      className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6]/60"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]"
                        onClick={() => {
                          void toggleBatch(batch.id)
                        }}
                      >
                        {expanded ? (
                          <ChevronDownIcon className="size-4 shrink-0" />
                        ) : (
                          <ChevronRightIcon className="size-4 shrink-0" />
                        )}
                        <span className="font-medium leading-normal">
                          {formatAbsolute(batch.started_at)}
                        </span>
                        <span className="text-muted-foreground">{batch.source}</span>
                        <span className="ml-auto tabular-nums text-muted-foreground">
                          {batch.summary.synced}/{batch.summary.total}
                          {batch.summary.failed > 0 ? (
                            <span className="text-red-700"> · {batch.summary.failed} err</span>
                          ) : null}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="border-t border-[#e8e0d8] px-3 py-2">
                          {batchRunsLoading ? (
                            <p className="text-[12px] text-muted-foreground">{t("loading")}</p>
                          ) : batchRuns.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground">—</p>
                          ) : (
                            <ul className="grid gap-1 text-[12px]">
                              {batchRuns.map((run) => (
                                <li key={run.id} className="flex flex-wrap gap-2">
                                  <span className="font-medium">
                                    {clientNameById.get(run.organization_id) ??
                                      run.organization_id.slice(0, 8)}
                                  </span>
                                  <span className="capitalize">{run.status}</span>
                                  {run.message ? (
                                    <span className="text-muted-foreground">{run.message}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </>
      ) : null}

      {historySlug ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setHistorySlug(null)}
        >
          <div
            className={cn(adminSectionCardClass, "max-h-[70vh] w-full max-w-lg overflow-auto p-5")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">{t("metaSyncRunHistory")}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setHistorySlug(null)}>
                {t("onboardingCloseDetail")}
              </Button>
            </div>
            <ul className="mt-4 grid gap-2 text-[13px]">
              {historyRuns.length === 0 ? (
                <li className="text-muted-foreground">{t("loading")}</li>
              ) : (
                historyRuns.map((run, index) => (
                  <li key={`${run.started_at}-${index}`} className="rounded-lg bg-[#faf8f6] px-3 py-2">
                    <p className="font-medium capitalize">{run.status}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatAbsolute(run.started_at)}
                    </p>
                    {run.message ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">{run.message}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
