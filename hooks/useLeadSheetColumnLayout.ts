"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"
import type { Lead } from "@/lib/leads"
import { headerDisplayText, leadSheetCellDisplayText } from "@/lib/leads/sheet-column-display"
import {
  autoFitColumnWidth,
  defaultColumnWidth,
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

function readStored(key: string): StoredSheetLayout | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSheetLayout>
    if (!parsed || typeof parsed !== "object") return null
    return {
      displayMode: parseStoredDisplayMode(parsed as Partial<StoredSheetLayout>),
    }
  } catch {
    return null
  }
}

function writeStored(key: string, mode: SheetDisplayMode) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ displayMode: mode }))
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
  const [displayMode, setDisplayModeState] = useState<SheetDisplayMode>(
    () => readStored(storageKey)?.displayMode ?? "compact"
  )

  useEffect(() => {
    const next = readStored(storageKey)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is external store keyed by storageKey
    setDisplayModeState(next?.displayMode ?? "compact")
  }, [storageKey])

  const visibleColumns = useMemo(() => [...input.columns], [input.columns])

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
      setDisplayModeState(mode)
      writeStored(storageKey, mode)
    },
    [storageKey]
  )

  return {
    visibleColumns,
    widthForColumn,
    stickyLeftPx,
    displayMode,
    setDisplayMode,
  }
}
