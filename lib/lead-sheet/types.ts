export const BUILTIN_COLUMN_KEYS = [
  "date",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "address",
  "zipCode",
  "city",
  "serviceIds",
  "metaAdId",
  "status",
  "salesPrice",
  "profit",
] as const

export type BuiltinColumnKey = (typeof BUILTIN_COLUMN_KEYS)[number]

export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "date",
  "time",
  "number",
  "select",
  "image",
] as const

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export type LeadSheetCustomFieldDef = {
  id: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  required: boolean
  config: {
    options?: string[]
    maxFileBytes?: number
  }
}

export type LeadSheetTemplateColumn =
  | {
      id: string
      sortIndex: number
      kind: "builtin"
      builtinKey: BuiltinColumnKey
      /** The template hides this column from the client dashboard (data is still collected). */
      hiddenForClient?: boolean
    }
  | {
      id: string
      sortIndex: number
      kind: "custom"
      customField: LeadSheetCustomFieldDef
      /** The template hides this column from the client dashboard (data is still collected). */
      hiddenForClient?: boolean
    }

/** A field in the library: built-in (fixed, locked) or custom (created by an admin). */
export type LeadSheetLibraryField =
  | { kind: "builtin"; builtinKey: BuiltinColumnKey }
  | {
      kind: "custom"
      customField: LeadSheetCustomFieldDef
      /** How many templates currently use the field. */
      templateCount: number
    }

/**
 * Built-in fields every template must contain and no one can hide from the client dashboard:
 * without them a lead has no identity, contact details, date or pipeline stage.
 */
export const LOCKED_BUILTIN_KEYS: readonly BuiltinColumnKey[] = [
  "fullName",
  "email",
  "phone",
  "date",
  "status",
]

export function isLockedBuiltinKey(key: string): boolean {
  return (LOCKED_BUILTIN_KEYS as readonly string[]).includes(key)
}

export type LeadSheetColumnPreviewItem =
  { kind: "builtin"; builtinKey: BuiltinColumnKey } | { kind: "custom"; label: string }

export type LeadSheetTemplateSummary = {
  id: string
  name: string
  description: string
  isSystemDefault: boolean
  isShared: boolean
  organizationId: string | null
  sourceTemplateId: string | null
  /** @deprecated Templates use categoryIds for industry tags; kept for legacy reads. */
  subcategoryIds: string[]
  categoryIds: string[]
  columnCount?: number
  columnPreview?: LeadSheetColumnPreviewItem[]
  /** Number of clients currently on this template (only set when requested). */
  clientCount?: number
}

/** A client that uses a template. */
export type TemplateClientRef = { id: string; slug: string; name: string }

export type ResolvedLeadSheetConfig = {
  template: LeadSheetTemplateSummary
  columns: LeadSheetTemplateColumn[]
}

export type BusinessCategory = {
  id: string
  slug: string
  nameDa: string
  nameEn: string
  sortIndex: number
  subcategories: BusinessSubcategory[]
}

export type BusinessSubcategory = {
  id: string
  categoryId: string
  slug: string
  nameDa: string
  nameEn: string
  sortIndex: number
}

export function isBuiltinColumnKey(value: string): value is BuiltinColumnKey {
  return (BUILTIN_COLUMN_KEYS as readonly string[]).includes(value)
}

export function isCustomFieldType(value: string): value is CustomFieldType {
  return (CUSTOM_FIELD_TYPES as readonly string[]).includes(value)
}
