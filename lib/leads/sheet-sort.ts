import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import {
  formatLeadServices,
  LEAD_STATUSES,
  type Lead,
  type LeadStatusId,
} from "@/lib/leads"
import type { NamedService } from "@/lib/performance/services"

export type SheetSortDirection = "asc" | "desc"

export type SheetSortState = {
  columnId: string
  direction: SheetSortDirection
} | null

const SORTABLE_BUILTIN_KEYS = new Set(["date", "salesPrice", "profit"])

/** Only deal/date metrics and numeric custom fields — not name, status, services, etc. */
export function isColumnSortable(col: LeadSheetTemplateColumn): boolean {
  if (col.kind === "custom") return col.customField.fieldType === "number"
  return SORTABLE_BUILTIN_KEYS.has(col.builtinKey)
}

function statusOrder(status: LeadStatusId): number {
  const index = LEAD_STATUSES.findIndex((s) => s.id === status)
  return index >= 0 ? index : LEAD_STATUSES.length
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined): number {
  const aNull = a == null
  const bNull = b == null
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  return a - b
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
}

function sortValueForColumn(
  lead: Lead,
  col: LeadSheetTemplateColumn,
  enabledServices: readonly NamedService[]
): string | number {
  if (col.kind === "custom") {
    const val = lead.customFields?.[col.customField.fieldKey]
    switch (col.customField.fieldType) {
      case "number":
        return typeof val === "number" ? val : Number.NaN
      case "date":
      case "time":
      case "text":
      case "textarea":
      case "select":
        return typeof val === "string" ? val : ""
      default:
        return ""
    }
  }

  switch (col.builtinKey) {
    case "date": {
      const time = lead.time ?? ""
      return `${lead.date}\t${time}`
    }
    case "status":
      return statusOrder(lead.status)
    case "salesPrice":
      return lead.salesPrice ?? Number.NaN
    case "profit":
      return lead.profit ?? Number.NaN
    case "serviceIds":
      return formatLeadServices(lead, enabledServices).toLowerCase()
    case "segment":
      return lead.segment || ""
    default:
      return String(lead[col.builtinKey] ?? "").trim()
  }
}

export function compareLeadsByColumn(
  left: Lead,
  right: Lead,
  col: LeadSheetTemplateColumn,
  direction: SheetSortDirection,
  enabledServices: readonly NamedService[] = []
): number {
  const a = sortValueForColumn(left, col, enabledServices)
  const b = sortValueForColumn(right, col, enabledServices)

  let cmp = 0
  if (typeof a === "number" && typeof b === "number") {
    const aNan = Number.isNaN(a)
    const bNan = Number.isNaN(b)
    if (aNan || bNan) {
      cmp = compareNullableNumber(Number.isNaN(a) ? null : a, Number.isNaN(b) ? null : b)
    } else {
      cmp = a - b
    }
  } else {
    cmp = compareText(String(a), String(b))
  }

  if (cmp === 0) cmp = left.id.localeCompare(right.id)
  return direction === "asc" ? cmp : -cmp
}

export function sortLeadsBySheetColumn(
  leads: readonly Lead[],
  col: LeadSheetTemplateColumn,
  direction: SheetSortDirection,
  enabledServices: readonly NamedService[] = []
): Lead[] {
  return [...leads].sort((a, b) => compareLeadsByColumn(a, b, col, direction, enabledServices))
}

/**
 * Same header, three steps: ascending, then descending, then the original order.
 * Matches the cycle used by most data-grid products.
 */
export function nextSortDirection(
  current: SheetSortState,
  columnId: string
): SheetSortDirection | null {
  if (current?.columnId !== columnId) return "asc"
  if (current.direction === "asc") return "desc"
  return null
}

export function findDefaultDateColumnId(columns: readonly LeadSheetTemplateColumn[]): string | null {
  const dateCol = columns.find((c) => c.kind === "builtin" && c.builtinKey === "date")
  return dateCol?.id ?? null
}

export function sortLeadsWithSheetState(
  leads: readonly Lead[],
  columns: readonly LeadSheetTemplateColumn[],
  sort: SheetSortState,
  enabledServices: readonly NamedService[] = []
): Lead[] {
  if (sort) {
    const col = columns.find((c) => c.id === sort.columnId)
    if (col && isColumnSortable(col)) {
      return sortLeadsBySheetColumn(leads, col, sort.direction, enabledServices)
    }
  }
  return [...leads]
}
