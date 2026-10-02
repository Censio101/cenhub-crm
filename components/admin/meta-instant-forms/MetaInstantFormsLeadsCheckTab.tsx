"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2Icon, RefreshCwIcon } from "lucide-react"

import type { MetaInstantLeadPreviewRow } from "@/components/admin/meta-instant-forms/types"
import {
  MetaInstantFormsLeadsPanelShell,
  MetaInstantFormsLeadsTableSkeleton,
} from "@/components/admin/meta-instant-forms/MetaInstantFormsLeadsTableSkeleton"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  collectMetaLeadDisplayColumns,
  metaLeadFieldColumnLabel,
} from "@/lib/meta/meta-lead-field-display"
import { META_INSTANT_LEADS_PAGE_SIZE } from "@/lib/meta/meta-instant-forms-service"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { useKeyedState } from "@/lib/react/use-keyed-state"
import { cn } from "cn"

type PreviewResponse = {
  leads: MetaInstantLeadPreviewRow[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  syncedAt: string | null
  daysBack?: number
  added?: number
  skipped?: boolean
  reason?: string
}

type Props = {
  slug: string
  canLoadForms: boolean
  metaSettingsHref: string
}

const DENMARK_TIME_ZONE = "Europe/Copenhagen"

function formatSyncedTimestamp(iso: string, locale: "da" | "en") {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const tag = locale === "da" ? "da-DK" : "en-GB"
  const timeZone = DENMARK_TIME_ZONE
  return {
    date: date.toLocaleDateString(tag, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    }),
    time: date.toLocaleTimeString(tag, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }),
  }
}

export function MetaInstantFormsLeadsCheckTab({ slug, canLoadForms, metaSettingsHref }: Props) {
  const { t, locale } = useLanguage()
  const [loadingCache, setLoadingCache] = useState(false)
  const [syncingMeta, setSyncingMeta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The list belongs to one client and connection state; it resets when either changes.
  const resetKey = `${slug}|${canLoadForms}`
  const [leads, setLeads] = useKeyedState<MetaInstantLeadPreviewRow[]>([], resetKey)
  const [total, setTotal] = useKeyedState<number | null>(null, resetKey)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)
  const [syncInfo, setSyncInfo] = useState<string | null>(null)
  const [loadedOnce, setLoadedOnce] = useKeyedState(false, resetKey)
  const autoLeadsSyncSlug = useRef<string | null>(null)

  const fieldColumns = useMemo(() => collectMetaLeadDisplayColumns(leads), [leads])
  const hasStoredLeads = (total ?? 0) > 0

  const noticeProps = {
    dismissLabel: t("noticeDismiss"),
    size: adminFormNoticeDefaults.size as "sm",
    successAutoDismissMs: adminFormNoticeDefaults.quickSuccessAutoDismissMs,
    errorAutoDismissMs: adminFormNoticeDefaults.errorAutoDismissMs,
    warningAutoDismissMs: adminFormNoticeDefaults.quickSuccessAutoDismissMs,
  }

  const applyPreview = useCallback(
    (data: PreviewResponse) => {
      if (data.skipped) {
        setLeads([])
        setTotal(0)
        setHasMore(false)
        setSyncedAt(null)
        setError(data.reason ?? t("metaInstantFormsLoadError"))
        return
      }
      setError(null)
      setLeads(data.leads)
      setTotal(data.total)
      setPage(data.page)
      setHasMore(data.hasMore)
      setSyncedAt(data.syncedAt)
    },
    [t, setLeads, setTotal]
  )

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoadingCache(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/admin/organizations/${slug}/meta-instant-forms/preview-leads?page=${pageNum}&pageSize=${META_INSTANT_LEADS_PAGE_SIZE}`
        )
        if (!response.ok) throw new Error("preview")
        const data = (await response.json()) as PreviewResponse
        setLoadedOnce(true)
        applyPreview(data)
      } catch {
        setError(t("metaInstantFormsLoadError"))
        setLoadedOnce(true)
      } finally {
        setLoadingCache(false)
      }
    },
    [slug, applyPreview, t, setLoadedOnce]
  )

  const syncFromMeta = useCallback(
    async (options: { isRefresh: boolean; quiet?: boolean }) => {
      setSyncingMeta(true)
      setError(null)
      setSyncSuccess(null)
      setSyncInfo(null)
      try {
        const response = await fetch(
          `/api/admin/organizations/${slug}/meta-instant-forms/preview-leads?page=1&pageSize=${META_INSTANT_LEADS_PAGE_SIZE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ daysBack: 90 }),
          }
        )
        if (!response.ok) throw new Error("sync")
        const data = (await response.json()) as PreviewResponse
        setLoadedOnce(true)
        applyPreview(data)
        if (!options.quiet && !data.skipped) {
          if (options.isRefresh && typeof data.added === "number") {
            if (data.added > 0) {
              setSyncSuccess(t("metaInstantFormsLeadsCheckAdded", { count: data.added }))
            } else {
              setSyncInfo(t("metaInstantFormsLeadsCheckUpToDate"))
            }
          } else if (!options.isRefresh && data.total > 0) {
            setSyncSuccess(t("metaInstantFormsLeadsCheckLoaded", { count: data.total }))
          }
        }
        return true
      } catch {
        setError(t("metaInstantFormsLoadError"))
        return false
      } finally {
        setSyncingMeta(false)
      }
    },
    [slug, applyPreview, t, setLoadedOnce]
  )

  useAsyncEffect(() => {
    if (!canLoadForms) return
    autoLeadsSyncSlug.current = null
    void fetchPage(1)
  }, [canLoadForms, slug, fetchPage])

  useEffect(() => {
    if (!canLoadForms || loadingCache || syncingMeta || !loadedOnce) return
    if ((total ?? 0) > 0) return
    if (autoLeadsSyncSlug.current === slug) return
    autoLeadsSyncSlug.current = slug
    void syncFromMeta({ isRefresh: false, quiet: true })
  }, [canLoadForms, loadingCache, syncingMeta, loadedOnce, total, slug, syncFromMeta])

  if (!canLoadForms) {
    return (
      <div
        className={cn(adminSectionCardClass, "space-y-2 px-4 py-8 text-sm text-muted-foreground")}
      >
        <p>{t("metaInstantFormsLeadsCheckNeedMeta")}</p>
        <Link
          href={metaSettingsHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("metaInstantFormsOpenMetaSettings")}
        </Link>
      </div>
    )
  }

  const busy = loadingCache || syncingMeta
  const bootstrapping = busy && !hasStoredLeads
  const showTable = hasStoredLeads && leads.length > 0
  const showEmpty = loadedOnce && !busy && !hasStoredLeads && !error
  const totalPages =
    total !== null ? Math.max(1, Math.ceil(total / META_INSTANT_LEADS_PAGE_SIZE)) : 1
  const syncedFormatted = syncedAt ? formatSyncedTimestamp(syncedAt, locale) : null

  const feedback = (
    <FormNoticeStack
      {...noticeProps}
      error={error}
      success={syncSuccess}
      warning={syncInfo}
      onDismissError={() => setError(null)}
      onDismissSuccess={() => setSyncSuccess(null)}
      onDismissWarning={() => setSyncInfo(null)}
      className="gap-1.5"
    />
  )

  return (
    <div className="space-y-4">
      <MetaInstantFormsLeadsPanelShell>
        <div className="flex flex-col gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold tracking-tight">
              {t("metaInstantFormsLeadsCheckTitle")}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {hasStoredLeads ? (
                <>
                  <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-sm font-semibold tabular-nums text-white">
                    {t("metaInstantFormsLeadsCheckLeadCount", { count: total ?? 0 })}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-[#e8e0d8] bg-white px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t("metaInstantFormsLeadsCheckWindowLabel")}
                  </span>
                </>
              ) : null}
              {syncedFormatted ? (
                <span className="text-xs text-muted-foreground sm:ml-1">
                  {t("metaInstantFormsLeadsCheckSyncedLine", {
                    date: syncedFormatted.date,
                    time: syncedFormatted.time,
                  })}
                </span>
              ) : null}
            </div>
          </div>
          {hasStoredLeads ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 self-start bg-white sm:self-center"
              disabled={busy}
              onClick={() => void syncFromMeta({ isRefresh: true })}
            >
              {syncingMeta ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              {t("metaInstantFormsLeadsCheckRefreshData")}
            </Button>
          ) : null}
        </div>

        {(syncSuccess || syncInfo || error) && hasStoredLeads ? (
          <div className="border-b border-[#e8e0d8] px-3 py-2">{feedback}</div>
        ) : null}

        {!hasStoredLeads && error ? (
          <div className="border-b border-[#e8e0d8] px-3 py-2">{feedback}</div>
        ) : null}

        {bootstrapping ? <MetaInstantFormsLeadsTableSkeleton /> : null}

        {showEmpty ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            <p>{t("metaInstantFormsLeadsCheckEmptyCache")}</p>
          </div>
        ) : null}

        {showTable ? (
          <div className="overflow-x-auto px-4 pb-3 pt-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap pl-1">
                    {t("metaInstantFormsLeadsCheckColDate")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t("metaInstantFormsLeadsCheckColForm")}
                  </TableHead>
                  {fieldColumns.map((key) => (
                    <TableHead key={key} className="whitespace-nowrap">
                      {metaLeadFieldColumnLabel(key)}
                    </TableHead>
                  ))}
                  <TableHead className="hidden whitespace-nowrap lg:table-cell">
                    {t("metaInstantFormsLeadsCheckColMetaId")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.metaLeadId}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {lead.createdTime ? new Date(lead.createdTime).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-sm" title={lead.formName}>
                      {lead.formName}
                    </TableCell>
                    {fieldColumns.map((key) => (
                      <TableCell
                        key={key}
                        className="max-w-[14rem] truncate text-sm"
                        title={lead.fields[key]}
                      >
                        {lead.fields[key] ?? "—"}
                      </TableCell>
                    ))}
                    <TableCell className="hidden max-w-[8rem] truncate font-mono text-[10px] text-muted-foreground lg:table-cell">
                      {lead.metaLeadId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {error && !bootstrapping && !hasStoredLeads ? (
          <div className="flex justify-center border-t border-[#e8e0d8] px-4 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                autoLeadsSyncSlug.current = null
                if ((total ?? 0) === 0 && loadedOnce) {
                  void syncFromMeta({ isRefresh: false })
                } else {
                  void fetchPage(1)
                }
              }}
            >
              {t("metaInstantFormsLeadsCheckRefreshData")}
            </Button>
          </div>
        ) : null}
      </MetaInstantFormsLeadsPanelShell>

      {showTable && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("metaInstantFormsLeadsCheckPage", { page, totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || page <= 1}
              onClick={() => void fetchPage(page - 1)}
            >
              {t("metaInstantFormsLeadsCheckPrev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !hasMore}
              onClick={() => void fetchPage(page + 1)}
            >
              {t("metaInstantFormsLeadsCheckNext")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
