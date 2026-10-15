import { columnVisibilityKey } from "@/lib/lead-sheet/client-visibility"
import type { BuiltinColumnKey, LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

export const DEFAULT_NOTIFY_SUBJECT_TEMPLATE = "Nyt lead fra {webhookNavn} | {service}"
export const DEFAULT_NOTIFY_INTRO_TEMPLATE = "Du har modtaget et nyt lead."
export const DEFAULT_NOTIFY_CLOSING_TEMPLATE = "Med venlig hilsen\nCensio lead system"

/** Built-in columns omitted from default email field selection. */
export const LEAD_NOTIFY_DEFAULT_EXCLUDED_BUILTINS = new Set<BuiltinColumnKey>([
  "date",
  "status",
  "wonDate",
  "salesPrice",
  "profit",
  "ltv",
  "metaAdId",
])

export function defaultIncludedColumnKeys(columns: readonly LeadSheetTemplateColumn[]): string[] {
  const keys: string[] = []
  for (const column of columns) {
    if (column.kind === "builtin") {
      if (LEAD_NOTIFY_DEFAULT_EXCLUDED_BUILTINS.has(column.builtinKey)) continue
    }
    keys.push(columnVisibilityKey(column))
  }
  return keys
}

export function effectiveIncludedColumnKeys(
  stored: readonly string[],
  visibleColumns: readonly LeadSheetTemplateColumn[]
): string[] {
  if (stored.length > 0) return [...stored]
  return defaultIncludedColumnKeys(visibleColumns)
}

export function templateOrDefault(
  value: string | null | undefined,
  fallback: string
): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}
