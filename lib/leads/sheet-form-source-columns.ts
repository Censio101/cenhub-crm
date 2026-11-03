import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"

/** Must match `sheet_source_label` on the Quick-Heat B2B webhook funnel. */
export const QUICK_HEAT_TRAILER_FORM_SOURCE_LABEL = "Quick-Heat Trailer"

/** Builtins for Quick-Heat rows: contact + company + pipeline, not calc-form or Meta lead id. */
const QUICK_HEAT_BUILTIN_KEYS = new Set<BuiltinColumnKey>([
  "date",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "serviceIds",
  "status",
  "wonDate",
  "salesPrice",
  "profit",
  "ltv",
])

function customFieldVisibleForQuickHeat(fieldKey: string): boolean {
  return fieldKey.trim().toLowerCase() === "note"
}

/**
 * Narrows columns when Leadformular is a short form (Quick-Heat). Calculation-only custom
 * columns are hidden; status / sale / profit / LTV stay visible.
 */
export function filterColumnsForFormSourceFilter(
  columns: readonly LeadSheetTemplateColumn[],
  formSource: string | "all"
): LeadSheetTemplateColumn[] {
  if (formSource === "all") return [...columns]
  if (formSource.trim() !== QUICK_HEAT_TRAILER_FORM_SOURCE_LABEL) return [...columns]

  return columns.filter((col) => {
    if (col.kind === "builtin") return QUICK_HEAT_BUILTIN_KEYS.has(col.builtinKey)
    return customFieldVisibleForQuickHeat(col.customField.fieldKey)
  })
}
