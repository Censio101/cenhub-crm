import {
  isEmptyImageObject,
  normalizeImageFieldValue,
  validateImageFieldValue,
} from "@/lib/lead-sheet/image-link"
import {
  BUILTIN_COLUMN_KEYS,
  type BuiltinColumnKey,
  type CustomFieldType,
  type LeadSheetCustomFieldDef,
  isCustomFieldType,
} from "@/lib/lead-sheet/types"

export function assertAllBuiltinsPresent(builtinKeys: readonly string[]): string | null {
  const set = new Set(builtinKeys)
  for (const key of BUILTIN_COLUMN_KEYS) {
    if (!set.has(key)) {
      return `Missing built-in column: ${key}`
    }
  }
  if (set.size !== BUILTIN_COLUMN_KEYS.length) {
    return "Duplicate or unknown built-in column keys"
  }
  return null
}

/** True when a custom field value counts as "cleared" (removes the stored value). */
export function isEmptyCustomFieldValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "") ||
    isEmptyImageObject(value)
  )
}

export function validateCustomFieldValue(
  field: Pick<LeadSheetCustomFieldDef, "fieldKey" | "fieldType" | "config" | "required">,
  value: unknown
): string | null {
  if (isEmptyCustomFieldValue(value)) {
    return field.required ? `${field.fieldKey} is required` : null
  }

  switch (field.fieldType) {
    case "text":
    case "textarea":
      return typeof value === "string" ? null : "Expected text"
    case "date":
    case "time":
      return typeof value === "string" ? null : "Expected string"
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "Expected number"
    case "select": {
      const options = field.config.options ?? []
      return typeof value === "string" && options.includes(value) ? null : "Invalid option"
    }
    case "image":
      return validateImageFieldValue(value)
    default:
      return "Unknown field type"
  }
}

/**
 * Validates a custom-fields patch against the template's field definitions.
 * `values` are the accepted (canonical) values; `cleared` lists keys the client emptied,
 * which must be removed from storage. Keys without a definition are ignored.
 */
export function sanitizeCustomFieldsPatch(
  patch: Record<string, unknown>,
  defs: LeadSheetCustomFieldDef[]
): { values: Record<string, unknown>; cleared: string[]; error: string | null } {
  const defByKey = new Map(defs.map((d) => [d.fieldKey, d]))
  const values: Record<string, unknown> = {}
  const cleared: string[] = []

  for (const [key, value] of Object.entries(patch)) {
    const def = defByKey.get(key)
    if (!def) continue
    const err = validateCustomFieldValue(def, value)
    if (err) return { values: {}, cleared: [], error: err }
    if (isEmptyCustomFieldValue(value)) {
      cleared.push(key)
    } else {
      values[key] = def.fieldType === "image" ? normalizeImageFieldValue(value) : value
    }
  }

  return { values, cleared, error: null }
}

export function parseCustomFieldType(value: string): CustomFieldType | null {
  return isCustomFieldType(value) ? value : null
}

export function orderedBuiltinKeys(): BuiltinColumnKey[] {
  return [...BUILTIN_COLUMN_KEYS]
}
