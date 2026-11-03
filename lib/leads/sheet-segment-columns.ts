import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"
import type { LeadSegmentId } from "@/lib/leads"

/** Builtins shown when the Type filter is Erhverv (B2B). Omits typical B2C-only address fields. */
const B2B_BUILTIN_KEYS = new Set<BuiltinColumnKey>([
  "date",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "metaAdId",
  "serviceIds",
  "status",
  "wonDate",
  "salesPrice",
  "profit",
  "ltv",
])

/** Custom field keys (substring match) kept visible for B2B rows. */
const B2B_CUSTOM_KEY_HINTS = ["note", "notat", "annonce", "ad_id", "meta", "platform"]

function customFieldVisibleForB2b(fieldKey: string): boolean {
  const key = fieldKey.trim().toLowerCase()
  return B2B_CUSTOM_KEY_HINTS.some((hint) => key.includes(hint))
}

/** Narrows visible columns when the sheet Type filter is B2B or B2C. */
export function filterColumnsForSegmentFilter(
  columns: readonly LeadSheetTemplateColumn[],
  segmentFilter: LeadSegmentId | "all"
): LeadSheetTemplateColumn[] {
  if (segmentFilter !== "b2b") return [...columns]

  return columns.filter((col) => {
    if (col.kind === "builtin") return B2B_BUILTIN_KEYS.has(col.builtinKey)
    return customFieldVisibleForB2b(col.customField.fieldKey)
  })
}
