"use client"

import { useEffect, useRef, useState } from "react"

import { ImportLeadsTable } from "@/components/admin/import/ImportLeadsTable"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { addResults, emptySummary, type ImportPreviewRow } from "@/lib/import/run-batches"
import type {
  ColumnMapping,
  ImportChunkResponse,
  ImportOptions,
  ImportRowInput,
} from "@/lib/import/types"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

type Props = {
  slug: string
  /** The first rows of the file. */
  rows: ImportRowInput[]
  mapping: ColumnMapping
  options: ImportOptions
  columns: LeadSheetTemplateColumn[]
}

const SAMPLE = 5

/** The first five rows as the leads they would become, updated as the mapping changes. */
export function ImportQuickPreview({ slug, rows, mapping, options, columns }: Props) {
  const { t } = useLanguage()
  const [state, setState] = useState<{
    key: string
    previews: ImportPreviewRow[]
    skipped: number
    failed: boolean
  } | null>(null)
  const firstRun = useRef(true)

  const sample = rows.slice(0, SAMPLE)
  const key = JSON.stringify([sample, mapping, options.defaultStatus, options.defaultPlatform])
  const hasMapping = Object.keys(mapping).length > 0

  useEffect(() => {
    if (!hasMapping || sample.length === 0) return
    let cancelled = false
    const delay = firstRun.current ? 0 : 500
    firstRun.current = false
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/organizations/${slug}/imports/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dryRun: true,
            rows: sample,
            mapping,
            options: { ...options, skipDuplicates: false },
            previewCount: SAMPLE,
          }),
        })
        const data = (await response.json().catch(() => ({}))) as ImportChunkResponse
        if (cancelled) return
        if (!response.ok) {
          setState({ key, previews: [], skipped: 0, failed: true })
          return
        }
        const summary = addResults(emptySummary(), data.results)
        setState({
          key,
          previews: summary.previews,
          skipped: summary.skippedRows.length,
          failed: false,
        })
      } catch {
        if (!cancelled) setState({ key, previews: [], skipped: 0, failed: true })
      }
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `key` stands for the rows, mapping and options, so equal content does not re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, key, hasMapping])

  if (!hasMapping) {
    return (
      <p className="rounded-lg border border-dashed border-[#d3c3b2] bg-[#faf8f6] px-3 py-3 text-sm text-muted-foreground">
        {t("importQuickEmpty")}
      </p>
    )
  }

  const loading = !state || state.key !== key
  return (
    <div className="space-y-2">
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: SAMPLE }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : state.failed ? (
        <p className="text-sm text-red-700">{t("funnelsLoadError")}</p>
      ) : state.previews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("importQuickNone")}</p>
      ) : (
        <ImportLeadsTable columns={columns} rows={state.previews} />
      )}
      {!loading && state && state.skipped > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("importQuickSkipped").replace("{count}", String(state.skipped))}
        </p>
      ) : null}
    </div>
  )
}
