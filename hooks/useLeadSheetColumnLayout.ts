"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"
import type { Lead } from "@/lib/leads"
import { headerDisplayText, leadSheetCellDisplayText } from "@/lib/leads/sheet-column-display"
import { essentialSheetColumns } from "@/lib/leads/sheet-essential-columns"
import {
  autoFitColumnWidth,
  DEFAULT_ROW_DENSITY,
  defaultColumnWidth,
  defaultDisplayMode,
  layoutStorageKey,
  parseStoredDisplayMode,
  parseStoredRowDensity,
  type SheetDisplayMode,
  type SheetRowDensity,
  type StoredSheetLayout,
} from "@/lib/leads/sheet-column-widths"
import {
  parseStoredColumnColors,
  withColumnColor,
  type SheetColumnColorId,
  type SheetColumnColors,
} from "@/lib/leads/sheet-column-colors"
import type { NamedService } from "@/lib/performance/services"

export type LeadSheetColumnLayout = {
  visibleColumns: LeadSheetTemplateColumn[]
  widthForColumn: (col: LeadSheetTemplateColumn) => number
  stickyLeftPx: (columnIndex: number) => number | undefined
  displayMode: SheetDisplayMode
  setDisplayMode: (mode: SheetDisplayMode) => void
  rowDensity: SheetRowDensity
  setRowDensity: (density: SheetRowDensity) => void
  columnColors: SheetColumnColors
  setColumnColor: (columnId: string, color: SheetColumnColorId | null) => void
}

type SavedLayout = {
  displayMode: SheetDisplayMode | null
  rowDensity: SheetRowDensity | null
  columnColors: SheetColumnColors
}

const EMPTY_LAYOUT: SavedLayout = { displayMode: null, rowDensity: null, columnColors: {} }

function readStored(key: string): SavedLayout | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSheetLayout>
    if (!parsed || typeof parsed !== "object") return null
    return {
      displayMode: parseStoredDisplayMode(parsed),
      rowDensity: parseStoredRowDensity(parsed),
      columnColors: parseStoredColumnColors(parsed.columnColors),
    }
  } catch {
    return null
  }
}

function writeStored(key: string, layout: SavedLayout) {
  try {
    window.localStorage.setItem(key, JSON.stringify(layout))
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
}): LeadSheetColumnLayout {
  const storageKey = layoutStorageKey(input.organizationId ?? "local", input.page)
  const columnCount = input.columns.length
  const [saved, setSaved] = useState<SavedLayout>(
    () => readStored(storageKey) ?? EMPTY_LAYOUT
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is external store keyed by storageKey
    setSaved(readStored(storageKey) ?? EMPTY_LAYOUT)
  }, [storageKey])

  // Until the user picks a view, wide sheets start on Key columns.
  const displayMode: SheetDisplayMode = saved.displayMode ?? defaultDisplayMode(columnCount)
  const rowDensity: SheetRowDensity = saved.rowDensity ?? DEFAULT_ROW_DENSITY

  const visibleColumns = useMemo(() => {
    const all = [...input.columns]
    return displayMode === "key" ? essentialSheetColumns(all) : all
  }, [displayMode, input.columns])

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
        ...input.leads.slice(0, 200).map((lead) => leadSheetCellDisplayText(lead, col, displayCtx)),
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
      setSaved((prev) => {
        const next = { ...prev, displayMode: mode }
        writeStored(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const setRowDensity = useCallback(
    (density: SheetRowDensity) => {
      setSaved((prev) => {
        const next = { ...prev, rowDensity: density }
        writeStored(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const setColumnColor = useCallback(
    (columnId: string, color: SheetColumnColorId | null) => {
      setSaved((prev) => {
        const next = { ...prev, columnColors: withColumnColor(prev.columnColors, columnId, color) }
        writeStored(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const columnColors = saved.columnColors

  // One identity until something really changes, so memoized sheet rows are not re-drawn.
  return useMemo(
    () => ({
      visibleColumns,
      widthForColumn,
      stickyLeftPx,
      displayMode,
      setDisplayMode,
      rowDensity,
      setRowDensity,
      columnColors,
      setColumnColor,
    }),
    [
      visibleColumns,
      widthForColumn,
      stickyLeftPx,
      displayMode,
      setDisplayMode,
      rowDensity,
      setRowDensity,
      columnColors,
      setColumnColor,
    ]
  )
}
