import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { isLockedBuiltinKey } from "@/lib/lead-sheet/types"

const ESSENTIAL_BUILTINS = new Set([
  "date",
  "fullName",
  "email",
  "phone",
  "zipCode",
  "city",
  "status",
  "formProgress",
  "wonDate",
  "salesPrice",
  "profit",
  "ltv",
])

/** Custom keys that are usually enough for a quick scan (funnel / CRM extras). */
const ESSENTIAL_CUSTOM_KEYS = new Set([
  "lead_id",
  "stage",
  "session_status",
  "kvalitet",
  "quality",
  "energy_label",
  "heated_area_m2",
  "build_year",
])

/**
 * Subset of template columns for "Compact" view: identity, pipeline, money, and a few
 * high-signal custom fields — in the same order as the full sheet.
 */
export function essentialSheetColumns(
  columns: readonly LeadSheetTemplateColumn[]
): LeadSheetTemplateColumn[] {
  const picked = columns.filter((col) => {
    if (col.kind === "builtin") {
      return ESSENTIAL_BUILTINS.has(col.builtinKey) || isLockedBuiltinKey(col.builtinKey)
    }
    return ESSENTIAL_CUSTOM_KEYS.has(col.customField.fieldKey)
  })
  if (picked.length >= 3) return picked
  return columns.slice(0, Math.min(12, columns.length))
}
