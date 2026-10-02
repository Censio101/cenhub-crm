import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"

export function columnDisplayLabel(
  col: LeadSheetTemplateColumn,
  t: (key: MessageKey) => string
): string {
  if (col.kind === "custom") return col.customField.label
  return t(builtinColumnLabelKey(col.builtinKey))
}
