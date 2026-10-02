import type { CustomFieldType, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

export type FieldTypeConflict = {
  key: string
  label: string
  from: CustomFieldType
  to: CustomFieldType
}

function customTypesByKey(config: ResolvedLeadSheetConfig | null) {
  const map = new Map<string, { label: string; type: CustomFieldType }>()
  for (const col of config?.columns ?? []) {
    if (col.kind === "custom") {
      map.set(col.customField.fieldKey, {
        label: col.customField.label,
        type: col.customField.fieldType,
      })
    }
  }
  return map
}

/**
 * Field keys that exist in both sheets with different types. Leads keep values by key, so
 * after switching sheets such values would not match the new column type.
 */
export function findFieldTypeConflicts(
  previous: ResolvedLeadSheetConfig | null,
  next: ResolvedLeadSheetConfig | null
): FieldTypeConflict[] {
  const before = customTypesByKey(previous)
  const conflicts: FieldTypeConflict[] = []
  for (const [key, after] of customTypesByKey(next)) {
    const old = before.get(key)
    if (old && old.type !== after.type) {
      conflicts.push({ key, label: after.label, from: old.type, to: after.type })
    }
  }
  return conflicts
}
