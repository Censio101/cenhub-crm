import { shouldUseNotesTextareaField } from "@/lib/lead-sheet/notes-field"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

const CANONICAL_NOTES_KEY = "notes"

export function templateHasNotesLikeColumn(config: ResolvedLeadSheetConfig): boolean {
  return config.columns.some(
    (col) =>
      col.kind === "custom" &&
      shouldUseNotesTextareaField(col.customField.label, col.customField.fieldKey)
  )
}

/** Expected in-sheet control for each custom field type (for audits). */
export type CustomColumnUiKind =
  | "textarea-modal"
  | "select-dropdown"
  | "number-input"
  | "date-input"
  | "time-input"
  | "text-input"
  | "image-cell"

export function customColumnUiKind(fieldType: string): CustomColumnUiKind {
  switch (fieldType) {
    case "textarea":
      return "textarea-modal"
    case "select":
      return "select-dropdown"
    case "number":
      return "number-input"
    case "date":
      return "date-input"
    case "time":
      return "time-input"
    case "image":
      return "image-cell"
    default:
      return "text-input"
  }
}

export type TemplateColumnAuditRow = {
  templateId: string
  templateName: string
  isSystemDefault: boolean
  organizationId: string | null
  fieldKey: string
  label: string
  fieldType: string
  expectedUi: CustomColumnUiKind
  issues: string[]
}

export function auditCustomColumns(config: ResolvedLeadSheetConfig): TemplateColumnAuditRow[] {
  const rows: TemplateColumnAuditRow[] = []
  for (const col of config.columns) {
    if (col.kind !== "custom") continue
    const { fieldKey, label, fieldType } = col.customField
    const issues: string[] = []
    if (shouldUseNotesTextareaField(label, fieldKey) && fieldType !== "textarea") {
      issues.push("notes-like field must use field_type textarea")
    }
    if (fieldType === "select") {
      const options = col.customField.config.options ?? []
      if (options.length === 0) issues.push("select field has no options")
    }
    rows.push({
      templateId: config.template.id,
      templateName: config.template.name,
      isSystemDefault: config.template.isSystemDefault,
      organizationId: config.template.organizationId,
      fieldKey,
      label,
      fieldType,
      expectedUi: customColumnUiKind(fieldType),
      issues,
    })
  }
  return rows
}

export { CANONICAL_NOTES_KEY }