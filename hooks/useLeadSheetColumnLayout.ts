"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"
import type { Lead, LeadSegmentId } from "@/lib/leads"
import { filterColumnsForFormSourceFilter } from "@/lib/leads/sheet-form-source-columns"
import { filterColumnsForSegmentFilter } from "@/lib/leads/sheet-segment-columns"
import {
  autoFitSampleText,
  headerDisplayText,
  leadSheetCellDisplayText,
} from "@/lib/leads/sheet-column-display"
import {
  autoFitColumnWidth,
  defaultColumnWidth,
  defaultDisplayMode,
  layoutStorageKey,
  parseStoredDisplayMode,
  type SheetDisplayMode,
  type StoredSheetLayout,
} from "@/lib/leads/sheet-column-widths"
import type { NamedService } from "@/lib/performance/services"

export type LeadSheetColumnLayout = {
  visibleColumns: LeadSheetTemplateColumn[]
  widthForColumn: (col: LeadSheetTemplateColumn) => number
  stickyLeftPx: (columnIndex: number) => number | undefined
  displayMode: SheetDisplayMode
  setDisplayMode: (mode: SheetDisplayMode) => void
}

type SavedLayout = { displayMode: SheetDisplayMode | null }

/** Key columns was removed; saved "key" becomes all columns (compact widths). */
function normalizeDisplayMode(
  mode: SheetDisplayMode | null,
  columnCount: number
): "compact" | "full" {
  if (mode === "full") return "full"
  if (mode === "compact" || mode === "key") return "compact"
  return defaultDisplayMode(columnCount) === "full" ? "full" : "compact"
}

function readStored(key: string): SavedLayout | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSheetLayout>
    if (!parsed || typeof parsed !== "object") return null
    return {
      displayMode: parseStoredDisplayMode(parsed),
    }
  } catch {
    return null
  }
}

function writeStored(key: string, layout: SavedLayout) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ displayMode: layout.displayMode }))
  } catch {
    // quota / private mode
  }
}

export function useLeadSheetColumnLayout(input: {
  page: "leads" | "customers"
  organizationId: string | undefined
  columns: readonly LeadSheetTemplateColumn[]
  leads: readonly Lead[]
  enabledServices: readonly NamedService[]
  t: (key: MessageKey) => string
  /** Type filter on the sheet: B2B narrows which columns are shown. */
  segmentFilter?: LeadSegmentId | "all"
  /** Leadformular filter: Quick-Heat hides calculation-only columns. */
  formSourceFilter?: string | "all"
}): LeadSheetColumnLayout {
  const storageKey = layoutStorageKey(input.organizationId ?? "local", input.page)
  const columnCount = input.columns.length
  const [saved, setSaved] = useState<SavedLayout>(
    () => readStored(storageKey) ?? { displayMode: null }
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is external store keyed by storageKey
    setSaved(readStored(storageKey) ?? { displayMode: null })
  }, [storageKey])

  const displayMode = normalizeDisplayMode(saved.displayMode, columnCount)

  const visibleColumns = useMemo(() => {
    const bySegment = filterColumnsForSegmentFilter(input.columns, input.segmentFilter ?? "all")
    return filterColumnsForFormSourceFilter(bySegment, input.formSourceFilter ?? "all")
  }, [input.columns, input.formSourceFilter, input.segmentFilter])

  const displayCtx = useMemo(
    () => ({ t: input.t, enabledServices: input.enabledServices }),
    [input.enabledServices, input.t]
  )

  const fittedWidths = useMemo(() => {
    if (displayMode !== "full") return null
    const next: Record<string, number> = {}
    for (const col of input.columns) {
      const samples = [
        headerDisplayText(col, input.t),
        ...input.leads.slice(0, 200).map((lead) =>
          autoFitSampleText(col, leadSheetCellDisplayText(lead, col, displayCtx))
        ),
      ]
      next[col.id] = autoFitColumnWidth(col, samples, defaultColumnWidth(col))
    }
    return next
  }, [displayCtx, displayMode, input.columns, input.leads, input.t])

  const widthForColumn = useCallback(
    (col: LeadSheetTemplateColumn) => {
      if (displayMode === "full" && fittedWidths) {
        return fittedWidths[col.id] ?? defaultColumnWidth(col)
      }
      return defaultColumnWidth(col)
    },
    [displayMode, fittedWidths]
  )

  const stickyLeftPx = useCallback(
    (columnIndex: number) => {
      if (columnIndex === 0) return 0
      if (columnIndex === 1 && visibleColumns[0]) return widthForColumn(visibleColumns[0])
      return undefined
    },
    [visibleColumns, widthForColumn]
  )

  const setDisplayMode = useCallback(
    (mode: SheetDisplayMode) => {
      const nextMode: SheetDisplayMode = mode === "full" ? "full" : "compact"
      setSaved({ displayMode: nextMode })
      writeStored(storageKey, { displayMode: nextMode })
    },
    [storageKey]
  )

  return useMemo(
    () => ({
      visibleColumns,
      widthForColumn,
      stickyLeftPx,
      displayMode,
      setDisplayMode,
    }),
    [visibleColumns, widthForColumn, stickyLeftPx, displayMode, setDisplayMode]
  )
}
