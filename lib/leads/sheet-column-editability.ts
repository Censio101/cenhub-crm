import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

/** Built-ins the client may change inline in the sheet (operational / right-side workflow). */
export const SHEET_INLINE_EDITABLE_BUILTIN_KEYS = [
  "status",
  "serviceIds",
  "salesPrice",
  "profit",
] as const satisfies readonly BuiltinColumnKey[]

const inlineEditableBuiltinSet = new Set<string>(SHEET_INLINE_EDITABLE_BUILTIN_KEYS)

export function isLeadSheetColumnReadOnlyBuiltin(key: BuiltinColumnKey): boolean {
  return !inlineEditableBuiltinSet.has(key)
}

/** True when the sheet shows an editor control in the cell (not read-only text). */
export function isLeadSheetColumnInlineEditable(col: LeadSheetTemplateColumn): boolean {
  if (col.kind === "custom") return true
  return inlineEditableBuiltinSet.has(col.builtinKey)
}
