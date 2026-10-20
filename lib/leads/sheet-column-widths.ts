import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

export const SHEET_COL_WIDTH_MIN = 72
export const SHEET_COL_WIDTH_MAX = 720
export const SHEET_COL_WIDTH_DEFAULT = 140
export const SHEET_COL_CELL_PADDING_PX = 28

/** Dropdown / status cells need at least this width so triggers are not clipped by the next column. */
export const SHEET_COL_MIN_DROPDOWN = 168
export const SHEET_COL_MIN_STATUS = 216

const DEFAULT_BY_BUILTIN: Partial<Record<string, number>> = {
  date: 132,
  fullName: 176,
  email: 200,
  phone: 128,
  status: SHEET_COL_MIN_STATUS,
  serviceIds: SHEET_COL_MIN_DROPDOWN,
  address: 180,
  companyName: 160,
  segment: 100,
  zipCode: 88,
  city: 120,
  platform: 100,
  salesPrice: 112,
  profit: 112,
  ltv: 112,
  wonDate: 132,
}

export function minimumColumnWidth(col: LeadSheetTemplateColumn): number {
  if (col.kind === "builtin") {
    if (col.builtinKey === "status") return SHEET_COL_MIN_STATUS
    if (col.builtinKey === "serviceIds") return SHEET_COL_MIN_DROPDOWN
  }
  if (col.kind === "custom") {
    if (col.customField.fieldType === "select") return SHEET_COL_MIN_DROPDOWN
    if (col.customField.fieldType === "textarea") return 160
  }
  return SHEET_COL_WIDTH_MIN
}

export function defaultColumnWidth(col: LeadSheetTemplateColumn): number {
  let base = SHEET_COL_WIDTH_DEFAULT
  if (col.kind === "builtin") {
    base = DEFAULT_BY_BUILTIN[col.builtinKey] ?? SHEET_COL_WIDTH_DEFAULT
  } else if (col.customField.fieldType === "textarea") {
    base = 200
  } else if (col.customField.fieldType === "image") {
    base = 160
  }
  return Math.max(base, minimumColumnWidth(col))
}

export function clampColumnWidth(px: number): number {
  return Math.min(SHEET_COL_WIDTH_MAX, Math.max(SHEET_COL_WIDTH_MIN, Math.round(px)))
}

let measureCanvas: CanvasRenderingContext2D | null = null

/** Approximate rendered text width for auto-fit (14px UI font). */
export function measureSheetTextWidth(text: string): number {
  if (!text) return 0
  if (typeof document === "undefined") return text.length * 8
  if (!measureCanvas) {
    const canvas = document.createElement("canvas")
    measureCanvas = canvas.getContext("2d")
  }
  if (!measureCanvas) return text.length * 8
  measureCanvas.font = '500 13px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  return measureCanvas.measureText(text).width
}

export function autoFitColumnWidth(
  col: LeadSheetTemplateColumn,
  samples: readonly string[],
  fallback: number
): number {
  let max = measureSheetTextWidth(samples[0] ?? "")
  for (let i = 1; i < samples.length; i++) {
    max = Math.max(max, measureSheetTextWidth(samples[i] ?? ""))
  }
  if (max <= 0) return fallback
  return clampColumnWidth(Math.max(max + SHEET_COL_CELL_PADDING_PX, minimumColumnWidth(col)))
}

export type SheetDisplayMode = "compact" | "full"

export type StoredSheetLayout = {
  displayMode: SheetDisplayMode
  /** @deprecated ignored — column hide removed */
  hiddenColumnIds?: string[]
  fitText?: boolean
  widths?: Record<string, number>
}

export function layoutStorageKey(organizationId: string, page: "leads" | "customers"): string {
  return `cenhub:lead-sheet-layout:${organizationId}:${page}`
}

export function parseStoredDisplayMode(parsed: Partial<StoredSheetLayout>): SheetDisplayMode {
  if (parsed.displayMode === "full" || parsed.displayMode === "compact") {
    return parsed.displayMode
  }
  if (parsed.fitText === true) return "full"
  const widths = parsed.widths && typeof parsed.widths === "object" ? parsed.widths : {}
  if (Object.keys(widths).length > 0) return "full"
  return "compact"
}
