import {
  isLockedBuiltinKey,
  type LeadSheetTemplateColumn,
  type ResolvedLeadSheetConfig,
} from "@/lib/lead-sheet/types"

/** Stable id of a column inside `organizations.hidden_column_keys`. */
export function columnVisibilityKey(column: LeadSheetTemplateColumn): string {
  return column.kind === "builtin"
    ? `builtin:${column.builtinKey}`
    : `custom:${column.customField.fieldKey}`
}

/** Locked columns are always in a template and always shown to the client. */
export function isColumnLocked(column: LeadSheetTemplateColumn): boolean {
  return column.kind === "builtin" && isLockedBuiltinKey(column.builtinKey)
}

/** Why a column is (or is not) hidden from the client dashboard. */
export function columnVisibility(
  column: LeadSheetTemplateColumn,
  clientHiddenKeys: readonly string[]
): { hidden: boolean; byTemplate: boolean; byClient: boolean; locked: boolean } {
  const locked = isColumnLocked(column)
  const byTemplate = !locked && Boolean(column.hiddenForClient)
  const byClient = !locked && clientHiddenKeys.includes(columnVisibilityKey(column))
  return { hidden: byTemplate || byClient, byTemplate, byClient, locked }
}

/** The sheet as the client's dashboard should show it: hidden columns removed. */
export function visibleColumnsForClient(
  config: ResolvedLeadSheetConfig,
  clientHiddenKeys: readonly string[]
): ResolvedLeadSheetConfig {
  return {
    ...config,
    columns: config.columns.filter((column) => !columnVisibility(column, clientHiddenKeys).hidden),
  }
}

/** Custom field keys the client must not see (for stripping values out of API responses). */
export function hiddenCustomFieldKeys(
  config: ResolvedLeadSheetConfig,
  clientHiddenKeys: readonly string[]
): string[] {
  return config.columns
    .filter(
      (column): column is Extract<LeadSheetTemplateColumn, { kind: "custom" }> =>
        column.kind === "custom" && columnVisibility(column, clientHiddenKeys).hidden
    )
    .map((column) => column.customField.fieldKey)
}

/**
 * Keeps only keys that belong to a hideable column of this sheet (drops locked, unknown and
 * duplicate entries), so the stored list never carries junk.
 */
export function sanitizeClientHiddenKeys(
  input: readonly unknown[],
  config: ResolvedLeadSheetConfig
): string[] {
  const hideable = new Set(
    config.columns.filter((column) => !isColumnLocked(column)).map(columnVisibilityKey)
  )
  const out: string[] = []
  for (const value of input) {
    if (typeof value !== "string" || !hideable.has(value) || out.includes(value)) continue
    out.push(value)
  }
  return out
}

/** Removes hidden custom values from a lead before it is sent to a client. */
export function stripHiddenCustomFields<T extends { customFields?: Record<string, unknown> }>(
  lead: T,
  hiddenKeys: readonly string[]
): T {
  if (hiddenKeys.length === 0 || !lead.customFields) return lead
  const customFields = { ...lead.customFields }
  for (const key of hiddenKeys) delete customFields[key]
  return { ...lead, customFields }
}
