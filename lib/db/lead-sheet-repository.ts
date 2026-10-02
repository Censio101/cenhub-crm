import type { SupabaseClient } from "@supabase/supabase-js"

import {
  FieldKeyError,
  isValidFieldKey,
  suggestFieldKey,
  uniqueFieldKey,
} from "@/lib/lead-sheet/field-key"
import { assertAllBuiltinsPresent } from "@/lib/lead-sheet/validate"
import {
  columnVisibilityKey,
  hiddenCustomFieldKeys,
  isColumnLocked,
  visibleColumnsForClient,
} from "@/lib/lead-sheet/client-visibility"
import {
  BUILTIN_COLUMN_KEYS,
  type CustomFieldType,
  type LeadSheetCustomFieldDef,
  type LeadSheetLibraryField,
  type LeadSheetTemplateColumn,
  type LeadSheetTemplateSummary,
  type ResolvedLeadSheetConfig,
  type TemplateClientRef,
  isBuiltinColumnKey,
  isLockedBuiltinKey,
} from "@/lib/lead-sheet/types"

type TemplateRow = {
  id: string
  name: string
  description: string
  is_system_default: boolean
  is_shared: boolean
  organization_id: string | null
  source_template_id: string | null
}

type CustomFieldRow = {
  id: string
  field_key: string
  label: string
  field_type: CustomFieldType
  required: boolean
  config: Record<string, unknown>
}

type ColumnRow = {
  id: string
  template_id: string
  sort_index: number
  kind: "builtin" | "custom"
  builtin_key: string | null
  custom_field_id: string | null
  hidden_for_client: boolean
  /** Embedded library field (custom columns only). */
  lead_sheet_custom_fields?: CustomFieldRow | null
}

function mapCustomField(row: CustomFieldRow): LeadSheetCustomFieldDef {
  const config = row.config ?? {}
  return {
    id: row.id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required,
    config: {
      options: Array.isArray(config.options)
        ? config.options.filter((o): o is string => typeof o === "string")
        : undefined,
      maxFileBytes: typeof config.maxFileBytes === "number" ? config.maxFileBytes : undefined,
    },
  }
}

function mapTemplateSummary(
  row: TemplateRow,
  subcategoryIds: string[],
  categoryIds: string[]
): LeadSheetTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemDefault: row.is_system_default,
    isShared: row.is_shared,
    organizationId: row.organization_id,
    sourceTemplateId: row.source_template_id,
    subcategoryIds,
    categoryIds,
  }
}

async function loadSubcategoryIds(supabase: SupabaseClient, templateId: string): Promise<string[]> {
  const { data } = await supabase
    .from("lead_sheet_template_subcategories")
    .select("subcategory_id")
    .eq("template_id", templateId)
  return (data ?? []).map((r) => r.subcategory_id as string)
}

async function loadCategoryIds(supabase: SupabaseClient, templateId: string): Promise<string[]> {
  const { data } = await supabase
    .from("lead_sheet_template_categories")
    .select("category_id")
    .eq("template_id", templateId)
  return (data ?? []).map((r) => r.category_id as string)
}

async function loadCategoryIdsByTemplateIds(
  supabase: SupabaseClient,
  templateIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (templateIds.length === 0) return map
  const { data } = await supabase
    .from("lead_sheet_template_categories")
    .select("template_id, category_id")
    .in("template_id", templateIds)
  for (const row of data ?? []) {
    const tid = row.template_id as string
    const cid = row.category_id as string
    const list = map.get(tid) ?? []
    list.push(cid)
    map.set(tid, list)
  }
  return map
}

export async function setTemplateCategoryIds(
  supabase: SupabaseClient,
  templateId: string,
  categoryIds: string[]
): Promise<void> {
  await supabase.from("lead_sheet_template_categories").delete().eq("template_id", templateId)
  await supabase.from("lead_sheet_template_subcategories").delete().eq("template_id", templateId)
  if (categoryIds.length > 0) {
    const { error } = await supabase.from("lead_sheet_template_categories").insert(
      categoryIds.map((category_id) => ({
        template_id: templateId,
        category_id,
      }))
    )
    if (error) throw error
  }
}

/**
 * The client's sheet as their dashboard sees it: hidden columns removed (`visible`), plus the
 * custom field keys whose values must not be sent to the client. Backend paths (webhooks, Meta,
 * funnels) keep using `resolveLeadSheetForOrganization`, which returns every column.
 */
export async function resolveClientDashboardSheet(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  visible: ResolvedLeadSheetConfig | null
  hiddenCustomKeys: string[]
}> {
  const [full, clientHiddenKeys] = await Promise.all([
    resolveLeadSheetForOrganization(supabase, organizationId),
    getOrganizationHiddenColumnKeys(supabase, organizationId),
  ])
  if (!full) return { visible: null, hiddenCustomKeys: [] }
  return {
    visible: visibleColumnsForClient(full, clientHiddenKeys),
    hiddenCustomKeys: hiddenCustomFieldKeys(full, clientHiddenKeys),
  }
}

export async function getSystemDefaultTemplateId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("lead_sheet_templates")
    .select("id")
    .eq("is_system_default", true)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function resolveLeadSheetForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ResolvedLeadSheetConfig | null> {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("lead_sheet_template_id")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError) throw orgError

  let templateId = org?.lead_sheet_template_id as string | null
  if (!templateId) {
    templateId = await getSystemDefaultTemplateId(supabase)
  }
  if (!templateId) return null

  return getLeadSheetTemplateById(supabase, templateId)
}

export async function getLeadSheetTemplateById(
  supabase: SupabaseClient,
  templateId: string
): Promise<ResolvedLeadSheetConfig | null> {
  const { data: template, error: tErr } = await supabase
    .from("lead_sheet_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle()

  if (tErr) throw tErr
  if (!template) return null

  const [subcategoryIds, categoryIds, columnsResult] = await Promise.all([
    loadSubcategoryIds(supabase, templateId),
    loadCategoryIds(supabase, templateId),
    supabase
      .from("lead_sheet_template_columns")
      .select("*, lead_sheet_custom_fields(*)")
      .eq("template_id", templateId)
      .order("sort_index", { ascending: true }),
  ])

  if (columnsResult.error) throw columnsResult.error

  const columns: LeadSheetTemplateColumn[] = []
  for (const row of (columnsResult.data ?? []) as ColumnRow[]) {
    if (row.kind === "builtin" && row.builtin_key && isBuiltinColumnKey(row.builtin_key)) {
      columns.push({
        id: row.id,
        sortIndex: row.sort_index,
        kind: "builtin",
        builtinKey: row.builtin_key,
        hiddenForClient: row.hidden_for_client,
      })
    } else if (row.kind === "custom" && row.lead_sheet_custom_fields) {
      columns.push({
        id: row.id,
        sortIndex: row.sort_index,
        kind: "custom",
        customField: mapCustomField(row.lead_sheet_custom_fields),
        hiddenForClient: row.hidden_for_client,
      })
    }
  }

  return {
    template: mapTemplateSummary(template as TemplateRow, subcategoryIds, categoryIds),
    columns,
  }
}

/**
 * Clients per template. A client without an explicit template uses the system default,
 * so those count towards the default template.
 */
async function countClientsByTemplate(
  supabase: SupabaseClient,
  templates: readonly Pick<TemplateRow, "id" | "is_system_default">[]
): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("organizations").select("lead_sheet_template_id")
  if (error) throw error

  const defaultId = templates.find((tpl) => tpl.is_system_default)?.id ?? null
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const id = (row.lead_sheet_template_id as string | null) ?? defaultId
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

async function countColumnsByTemplate(
  supabase: SupabaseClient,
  templateIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (templateIds.length === 0) return counts
  const { data, error } = await supabase
    .from("lead_sheet_template_columns")
    .select("template_id")
    .in("template_id", templateIds)
  if (error) throw error
  for (const row of data ?? []) {
    const id = row.template_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** Clients currently on a template (including those falling back to the default one). */
export async function listClientsUsingTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<TemplateClientRef[]> {
  const { data: template, error: tErr } = await supabase
    .from("lead_sheet_templates")
    .select("is_system_default")
    .eq("id", templateId)
    .maybeSingle()
  if (tErr) throw tErr
  if (!template) return []

  let query = supabase.from("organizations").select("id, slug, name").order("name")
  query = template.is_system_default
    ? query.or(`lead_sheet_template_id.eq.${templateId},lead_sheet_template_id.is.null`)
    : query.eq("lead_sheet_template_id", templateId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
  }))
}

export async function listLeadSheetTemplates(
  supabase: SupabaseClient,
  filters?: {
    /** Filter templates tagged with this business category id. */
    categoryId?: string
    /** @deprecated Use categoryId */
    subcategoryId?: string
    sharedOnly?: boolean
    organizationId?: string | null
    /** Adds `clientCount` to each template (one extra query). */
    withClientCounts?: boolean
    /** Adds `columnCount` to each template (one extra query). */
    withColumnCounts?: boolean
  }
): Promise<LeadSheetTemplateSummary[]> {
  let query = supabase.from("lead_sheet_templates").select("*").order("name")

  if (filters?.organizationId) {
    query = query.or(
      `organization_id.eq.${filters.organizationId},and(is_shared.eq.true,organization_id.is.null)`
    )
  } else if (filters?.sharedOnly) {
    query = query.eq("is_shared", true).is("organization_id", null)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as TemplateRow[]

  const templateIds = rows.map((r) => r.id)
  const [categoryIdsByTemplate, clientCounts, columnCounts] = await Promise.all([
    loadCategoryIdsByTemplateIds(supabase, templateIds),
    filters?.withClientCounts ? countClientsByTemplate(supabase, rows) : Promise.resolve(null),
    filters?.withColumnCounts
      ? countColumnsByTemplate(supabase, templateIds)
      : Promise.resolve(null),
  ])

  // Standard (system default) template first, then the rest alphabetically.
  const summaries: LeadSheetTemplateSummary[] = rows
    .map((row) => {
      const summary = mapTemplateSummary(row, [], categoryIdsByTemplate.get(row.id) ?? [])
      if (clientCounts) summary.clientCount = clientCounts.get(row.id) ?? 0
      if (columnCounts) summary.columnCount = columnCounts.get(row.id) ?? 0
      return summary
    })
    .sort((a, b) => {
      if (a.isSystemDefault !== b.isSystemDefault) return a.isSystemDefault ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  const categoryFilter = filters?.categoryId ?? filters?.subcategoryId
  if (categoryFilter) {
    const categoryId = categoryFilter
    return summaries.filter((tpl) => {
      if (tpl.isSystemDefault) return true
      if (tpl.categoryIds.length === 0) return true
      return tpl.categoryIds.includes(categoryId)
    })
  }

  return summaries
}

/**
 * Renumbers a template's columns in a single database call.
 * (One `UPDATE` per column, run one after another, made add/remove/reorder slow.)
 */
async function applyColumnOrder(
  supabase: SupabaseClient,
  templateId: string,
  orderedColumnIds: string[]
): Promise<void> {
  const { error } = await supabase.rpc("reorder_lead_sheet_template_columns", {
    p_template_id: templateId,
    p_ordered_ids: orderedColumnIds,
  })
  if (error) throw error
}

export async function reorderTemplateColumns(
  supabase: SupabaseClient,
  templateId: string,
  orderedColumnIds: string[]
): Promise<ResolvedLeadSheetConfig> {
  const config = await getLeadSheetTemplateById(supabase, templateId)
  if (!config) throw new Error("Template not found")

  const idSet = new Set(config.columns.map((c) => c.id))
  if (orderedColumnIds.length !== config.columns.length) {
    throw new Error("Column count mismatch")
  }
  for (const id of orderedColumnIds) {
    if (!idSet.has(id)) throw new Error("Unknown column id")
  }

  const byId = new Map(config.columns.map((c) => [c.id, c]))
  const builtins = orderedColumnIds
    .map((id) => byId.get(id))
    .filter((c): c is LeadSheetTemplateColumn => Boolean(c))
    .filter((c) => c.kind === "builtin")
    .map((c) => (c.kind === "builtin" ? c.builtinKey : ""))

  if (config.template.isSystemDefault) {
    const validationError = assertAllBuiltinsPresent(builtins)
    if (validationError) throw new Error(validationError)
  }

  await applyColumnOrder(supabase, templateId, orderedColumnIds)

  const updated = await getLeadSheetTemplateById(supabase, templateId)
  if (!updated) throw new Error("Template not found")
  return updated
}

/** A template edit that is not allowed (e.g. changing the Standard template's field set). Maps to HTTP 400. */
export class TemplateEditError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TemplateEditError"
  }
}

async function requireTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<ResolvedLeadSheetConfig> {
  const config = await getLeadSheetTemplateById(supabase, templateId)
  if (!config) throw new Error("Template not found")
  return config
}

/**
 * Adds a field from the library to a template. Templates never create fields; the Standard
 * template's field set is fixed.
 */
export async function addFieldToTemplate(
  supabase: SupabaseClient,
  templateId: string,
  field: { builtinKey: string } | { customFieldId: string },
  afterColumnId: string | null
): Promise<ResolvedLeadSheetConfig> {
  const config = await requireTemplate(supabase, templateId)
  if (config.template.isSystemDefault) {
    throw new TemplateEditError("The Standard template's fields cannot be changed")
  }

  let insertIndex = config.columns.length
  if (afterColumnId) {
    const idx = config.columns.findIndex((c) => c.id === afterColumnId)
    if (idx < 0) throw new Error("Column not found")
    insertIndex = idx + 1
  }

  const row: Record<string, unknown> = { template_id: templateId }
  if ("builtinKey" in field) {
    if (!isBuiltinColumnKey(field.builtinKey)) throw new TemplateEditError("Unknown field")
    const key = field.builtinKey
    if (config.columns.some((c) => c.kind === "builtin" && c.builtinKey === key)) {
      throw new TemplateEditError("This field is already in the template")
    }
    row.kind = "builtin"
    row.builtin_key = key
  } else {
    if (
      config.columns.some((c) => c.kind === "custom" && c.customField.id === field.customFieldId)
    ) {
      throw new TemplateEditError("This field is already in the template")
    }
    const { data: exists, error: existsErr } = await supabase
      .from("lead_sheet_custom_fields")
      .select("id")
      .eq("id", field.customFieldId)
      .maybeSingle()
    if (existsErr) throw existsErr
    if (!exists) throw new TemplateEditError("Field not found")
    row.kind = "custom"
    row.custom_field_id = field.customFieldId
  }

  // Insert at the end (a free sort_index), then move it into place with one renumber call.
  row.sort_index = Math.max(-1, ...config.columns.map((c) => c.sortIndex)) + 1
  const { data: colRow, error: colErr } = await supabase
    .from("lead_sheet_template_columns")
    .insert(row)
    .select("id")
    .single()
  if (colErr) throw colErr

  const orderedIds = config.columns.map((c) => c.id)
  orderedIds.splice(insertIndex, 0, (colRow as { id: string }).id)
  await applyColumnOrder(supabase, templateId, orderedIds)

  return requireTemplate(supabase, templateId)
}

/** Removes a field from one template. The field stays in the library and lead data is kept. */
export async function removeColumnFromTemplate(
  supabase: SupabaseClient,
  templateId: string,
  columnId: string
): Promise<ResolvedLeadSheetConfig> {
  const config = await requireTemplate(supabase, templateId)
  if (config.template.isSystemDefault) {
    throw new TemplateEditError("The Standard template's fields cannot be changed")
  }
  const col = config.columns.find((c) => c.id === columnId)
  if (!col) throw new Error("Column not found")
  if (col.kind === "builtin" && isLockedBuiltinKey(col.builtinKey)) {
    throw new TemplateEditError("This field is required in every template")
  }

  const { error } = await supabase
    .from("lead_sheet_template_columns")
    .delete()
    .eq("id", columnId)
    .eq("template_id", templateId)
  if (error) throw error

  await applyColumnOrder(
    supabase,
    templateId,
    config.columns.filter((c) => c.id !== columnId).map((c) => c.id)
  )
  return requireTemplate(supabase, templateId)
}

/** Hide or show a column on the client dashboard for everyone on this template. */
export async function setTemplateColumnHidden(
  supabase: SupabaseClient,
  templateId: string,
  columnId: string,
  hidden: boolean
): Promise<ResolvedLeadSheetConfig> {
  const config = await requireTemplate(supabase, templateId)
  const col = config.columns.find((c) => c.id === columnId)
  if (!col) throw new Error("Column not found")
  if (hidden && col.kind === "builtin" && isLockedBuiltinKey(col.builtinKey)) {
    throw new TemplateEditError("This field is always shown to the client")
  }

  const { error } = await supabase
    .from("lead_sheet_template_columns")
    .update({ hidden_for_client: hidden })
    .eq("id", columnId)
    .eq("template_id", templateId)
  if (error) throw error
  return requireTemplate(supabase, templateId)
}

// ---------------------------------------------------------------------------
// Field library
// ---------------------------------------------------------------------------

/** Invalid column settings (e.g. options on a non-select field). Maps to HTTP 400. */
export class ColumnSettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ColumnSettingsError"
  }
}

/** Every built-in field (with its library label) and every custom field (with usage). */
export async function listLibraryFields(
  supabase: SupabaseClient
): Promise<LeadSheetLibraryField[]> {
  const [fieldsResult, usageResult] = await Promise.all([
    supabase.from("lead_sheet_custom_fields").select("*").order("label"),
    supabase.from("lead_sheet_template_columns").select("custom_field_id").eq("kind", "custom"),
  ])
  if (fieldsResult.error) throw fieldsResult.error
  if (usageResult.error) throw usageResult.error

  const usage = new Map<string, number>()
  for (const row of usageResult.data ?? []) {
    const id = row.custom_field_id as string
    usage.set(id, (usage.get(id) ?? 0) + 1)
  }

  const builtins: LeadSheetLibraryField[] = BUILTIN_COLUMN_KEYS.map((builtinKey) => ({
    kind: "builtin",
    builtinKey,
  }))
  const customs: LeadSheetLibraryField[] = ((fieldsResult.data ?? []) as CustomFieldRow[]).map(
    (row) => ({
      kind: "custom",
      customField: mapCustomField(row),
      templateCount: usage.get(row.id) ?? 0,
    })
  )
  return [...builtins, ...customs]
}

function cleanSelectOptions(raw: readonly unknown[]): string[] {
  const seen = new Set<string>()
  const options: string[] = []
  for (const item of raw) {
    const value = String(item).trim().slice(0, 80)
    const key = value.toLocaleLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    options.push(value)
  }
  return options
}

/** Creates a custom field in the library. The key is global and never changes afterwards. */
export async function createLibraryField(
  supabase: SupabaseClient,
  input: {
    label: string
    fieldType: CustomFieldType
    config?: Record<string, unknown>
    /** Explicit English field key. Omitted: suggested from the label. */
    fieldKey?: string
  }
): Promise<LeadSheetCustomFieldDef> {
  const label = input.label.trim()
  if (!label) throw new ColumnSettingsError("Label required")

  const { data: keyRows, error: keyErr } = await supabase
    .from("lead_sheet_custom_fields")
    .select("field_key")
  if (keyErr) throw keyErr
  const takenKeys = new Set((keyRows ?? []).map((row) => row.field_key as string))

  let fieldKey: string
  const requestedKey = input.fieldKey?.trim()
  if (requestedKey) {
    if (!isValidFieldKey(requestedKey)) {
      throw new FieldKeyError(
        "Field key must use English letters, numbers and underscores (2-48 characters, starting with a letter)",
        "invalid"
      )
    }
    if (takenKeys.has(requestedKey)) {
      throw new FieldKeyError("Field key is already used by another field", "taken")
    }
    fieldKey = requestedKey
  } else {
    fieldKey = uniqueFieldKey(suggestFieldKey(label), takenKeys)
  }

  let config = input.config ?? {}
  if (input.fieldType === "select") {
    const options = cleanSelectOptions(
      Array.isArray(config.options) ? (config.options as unknown[]) : []
    )
    if (options.length === 0) throw new ColumnSettingsError("At least one option is required")
    config = { ...config, options }
  }

  const { data, error } = await supabase
    .from("lead_sheet_custom_fields")
    .insert({
      field_key: fieldKey,
      label,
      field_type: input.fieldType,
      // Custom fields are never required; only Full name, Email and Phone are.
      required: false,
      config,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapCustomField(data as CustomFieldRow)
}

/**
 * Updates a custom field's label and (for select fields) its options. The key
 * and type never change. Lead values that use a removed option are kept; the UI shows them as
 * "removed".
 */
export async function updateLibraryField(
  supabase: SupabaseClient,
  fieldId: string,
  patch: { label?: string; options?: string[] }
): Promise<{ field: LeadSheetCustomFieldDef; affectedOrganizationIds: string[] }> {
  const { data: row, error: rowErr } = await supabase
    .from("lead_sheet_custom_fields")
    .select("*")
    .eq("id", fieldId)
    .maybeSingle()
  if (rowErr) throw rowErr
  if (!row) throw new Error("Field not found")
  const current = mapCustomField(row as CustomFieldRow)

  const update: Record<string, unknown> = {}
  if (patch.label !== undefined) {
    const label = patch.label.trim()
    if (!label) throw new ColumnSettingsError("Label required")
    update.label = label
  }
  if (patch.options !== undefined) {
    if (current.fieldType !== "select") {
      throw new ColumnSettingsError("Options only apply to select fields")
    }
    const options = cleanSelectOptions(patch.options)
    if (options.length === 0) throw new ColumnSettingsError("At least one option is required")
    update.config = { ...current.config, options }
  }

  if (Object.keys(update).length === 0) return { field: current, affectedOrganizationIds: [] }

  const { data: saved, error } = await supabase
    .from("lead_sheet_custom_fields")
    .update(update)
    .eq("id", fieldId)
    .select("*")
    .single()
  if (error) throw error

  return {
    field: mapCustomField(saved as CustomFieldRow),
    affectedOrganizationIds: await organizationIdsUsingField(supabase, fieldId),
  }
}

/** Clients whose sheet contains this custom field (through any template that uses it). */
async function organizationIdsUsingField(
  supabase: SupabaseClient,
  fieldId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("lead_sheet_template_columns")
    .select("template_id")
    .eq("custom_field_id", fieldId)
  if (error) throw error
  const templateIds = [...new Set((data ?? []).map((row) => row.template_id as string))]

  const orgIds = new Set<string>()
  for (const templateId of templateIds) {
    for (const client of await listClientsUsingTemplate(supabase, templateId)) orgIds.add(client.id)
  }
  return [...orgIds]
}

/**
 * Deletes a custom field from the library and from every template that uses it. Built-in
 * fields cannot be deleted. Optionally also removes the field's saved values from leads.
 */
export async function deleteLibraryField(
  supabase: SupabaseClient,
  fieldId: string,
  options: { purgeData?: boolean } = {}
): Promise<{ purgedLeads?: number; affectedOrganizationIds: string[] }> {
  const { data: row, error: rowErr } = await supabase
    .from("lead_sheet_custom_fields")
    .select("*")
    .eq("id", fieldId)
    .maybeSingle()
  if (rowErr) throw rowErr
  if (!row) throw new Error("Field not found")
  const field = mapCustomField(row as CustomFieldRow)

  const { data: usage, error: usageErr } = await supabase
    .from("lead_sheet_template_columns")
    .select("template_id")
    .eq("custom_field_id", fieldId)
  if (usageErr) throw usageErr
  const templateIds = [...new Set((usage ?? []).map((r) => r.template_id as string))]
  const affectedOrganizationIds = await organizationIdsUsingField(supabase, fieldId)

  // Deleting the field row cascades to its template columns.
  const { error } = await supabase.from("lead_sheet_custom_fields").delete().eq("id", fieldId)
  if (error) throw error

  for (const templateId of templateIds) {
    const config = await getLeadSheetTemplateById(supabase, templateId)
    if (config) {
      await applyColumnOrder(
        supabase,
        templateId,
        config.columns.map((c) => c.id)
      )
    }
  }

  let purgedLeads: number | undefined
  if (options.purgeData) {
    if (affectedOrganizationIds.length > 0) {
      const { data, error: purgeErr } = await supabase.rpc("remove_custom_field_values", {
        p_org_ids: affectedOrganizationIds,
        p_key: field.fieldKey,
      })
      if (purgeErr) throw purgeErr
      purgedLeads = Number(data ?? 0)
    } else {
      purgedLeads = 0
    }
  }

  return purgedLeads === undefined
    ? { affectedOrganizationIds }
    : { purgedLeads, affectedOrganizationIds }
}

export async function getOrganizationHiddenColumnKeys(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("hidden_column_keys")
    .eq("id", organizationId)
    .maybeSingle()
  if (error) throw error
  const keys = (data?.hidden_column_keys ?? []) as unknown
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : []
}

export async function setOrganizationHiddenColumnKeys(
  supabase: SupabaseClient,
  organizationId: string,
  keys: string[]
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ hidden_column_keys: keys })
    .eq("id", organizationId)
  if (error) throw error
}

export async function duplicateLeadSheetTemplate(
  supabase: SupabaseClient,
  sourceId: string,
  options: {
    name: string
    organizationId?: string | null
    isShared?: boolean
    copySubcategories?: boolean
  }
): Promise<ResolvedLeadSheetConfig> {
  const source = await getLeadSheetTemplateById(supabase, sourceId)
  if (!source) throw new Error("Source template not found")

  const { data: templateRow, error: tErr } = await supabase
    .from("lead_sheet_templates")
    .insert({
      name: options.name,
      description: source.template.description,
      is_system_default: false,
      is_shared: options.isShared ?? !options.organizationId,
      organization_id: options.organizationId ?? null,
      source_template_id: sourceId,
    })
    .select("*")
    .single()

  if (tErr) throw tErr
  const newTemplateId = (templateRow as TemplateRow).id

  // A client's own sheet has no template-level hiding: its visibility is the client's own list
  // ("Shown to client"). Columns the source template hid are carried over into that list.
  const isClientSheet = Boolean(options.organizationId)
  if (isClientSheet && options.organizationId) {
    const carried = source.columns
      .filter((col) => !isColumnLocked(col) && col.hiddenForClient)
      .map(columnVisibilityKey)
    if (carried.length > 0) {
      const existing = await getOrganizationHiddenColumnKeys(supabase, options.organizationId)
      await setOrganizationHiddenColumnKeys(supabase, options.organizationId, [
        ...new Set([...existing, ...carried]),
      ])
    }
  }

  // Fields live in the library, so a copy shares them: same custom field ids, same keys.
  for (let i = 0; i < source.columns.length; i++) {
    const col = source.columns[i]
    const { error } = await supabase.from("lead_sheet_template_columns").insert(
      col.kind === "builtin"
        ? {
            template_id: newTemplateId,
            sort_index: i,
            kind: "builtin",
            builtin_key: col.builtinKey,
            hidden_for_client: isClientSheet ? false : Boolean(col.hiddenForClient),
          }
        : {
            template_id: newTemplateId,
            sort_index: i,
            kind: "custom",
            custom_field_id: col.customField.id,
            hidden_for_client: isClientSheet ? false : Boolean(col.hiddenForClient),
          }
    )
    if (error) throw error
  }

  if (options.copySubcategories !== false) {
    await setTemplateCategoryIds(supabase, newTemplateId, source.template.categoryIds)
  }

  const created = await getLeadSheetTemplateById(supabase, newTemplateId)
  if (!created) throw new Error("Clone failed")
  return created
}

export async function createEmptyTemplate(
  supabase: SupabaseClient,
  input: { name: string; description?: string; isShared?: boolean; organizationId?: string | null }
): Promise<ResolvedLeadSheetConfig> {
  const defaultId = await getSystemDefaultTemplateId(supabase)
  if (defaultId) {
    return duplicateLeadSheetTemplate(supabase, defaultId, {
      name: input.name,
      organizationId: input.organizationId,
      isShared: input.isShared ?? !input.organizationId,
      copySubcategories: false,
    })
  }

  const { data: templateRow, error: tErr } = await supabase
    .from("lead_sheet_templates")
    .insert({
      name: input.name,
      description: input.description ?? "",
      is_system_default: false,
      is_shared: input.isShared ?? !input.organizationId,
      organization_id: input.organizationId ?? null,
    })
    .select("*")
    .single()

  if (tErr) throw tErr
  const templateId = (templateRow as TemplateRow).id

  for (let i = 0; i < BUILTIN_COLUMN_KEYS.length; i++) {
    const key = BUILTIN_COLUMN_KEYS[i]
    await supabase.from("lead_sheet_template_columns").insert({
      template_id: templateId,
      sort_index: i,
      kind: "builtin",
      builtin_key: key,
    })
  }

  const created = await getLeadSheetTemplateById(supabase, templateId)
  if (!created) throw new Error("Create failed")
  return created
}

export function listCustomFieldDefs(config: ResolvedLeadSheetConfig): LeadSheetCustomFieldDef[] {
  return config.columns
    .filter((c): c is Extract<LeadSheetTemplateColumn, { kind: "custom" }> => c.kind === "custom")
    .map((c) => c.customField)
}

/**
 * Records that lead sheets changed for these clients:
 * - stamps `lead_sheet_changed_at` for every client, so mapped Meta forms can prompt a remap;
 * - flags clients that already have a webhook (`webhook_payload_stale_since`) so an admin
 *   reviews the Funnels page. Clients without one have no sender that could break.
 * The earliest webhook flag date is kept until it is marked as reviewed.
 * Returns the organization ids that need a webhook review.
 */
export async function recordLeadSheetChangeForOrganizations(
  supabase: SupabaseClient,
  organizationIds: string[]
): Promise<string[]> {
  if (organizationIds.length === 0) return []

  const { error: stampError } = await supabase
    .from("organizations")
    .update({ lead_sheet_changed_at: new Date().toISOString() })
    .in("id", organizationIds)
  if (stampError) throw stampError

  const { data, error } = await supabase
    .from("lead_funnels")
    .select("organization_id")
    .in("organization_id", organizationIds)
  if (error) throw error

  const withWebhooks = [...new Set((data ?? []).map((row) => row.organization_id as string))]
  if (withWebhooks.length === 0) return []

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ webhook_payload_stale_since: new Date().toISOString() })
    .in("id", withWebhooks)
    .is("webhook_payload_stale_since", null)
  if (updateError) throw updateError

  return withWebhooks
}

/**
 * Best-effort: records a sheet change for every client on a template. A failure here must
 * never fail the column edit that triggered it.
 */
export async function recordLeadSheetChangeForTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  try {
    const clients = await listClientsUsingTemplate(supabase, templateId)
    await recordLeadSheetChangeForOrganizations(
      supabase,
      clients.map((c) => c.id)
    )
  } catch (error) {
    console.error("recordLeadSheetChangeForTemplate failed", error)
  }
}

export async function clearWebhookReview(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ webhook_payload_stale_since: null })
    .eq("id", organizationId)
  if (error) throw error
}

export async function setOrganizationLeadSheetTemplateId(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string
): Promise<void> {
  const { error: orgErr } = await supabase
    .from("organizations")
    .update({ lead_sheet_template_id: templateId })
    .eq("id", organizationId)

  if (orgErr) throw orgErr
}

export async function setOrganizationSubcategoryIds(
  supabase: SupabaseClient,
  organizationId: string,
  subcategoryIds: string[]
): Promise<void> {
  await supabase.from("organization_subcategories").delete().eq("organization_id", organizationId)

  if (subcategoryIds.length > 0) {
    const { error } = await supabase.from("organization_subcategories").insert(
      subcategoryIds.map((subcategory_id) => ({
        organization_id: organizationId,
        subcategory_id,
      }))
    )
    if (error) throw error
  }
}

export function isTemplateAssignableToOrganization(
  template: LeadSheetTemplateSummary,
  organizationId: string
): boolean {
  if (template.organizationId === organizationId) return true
  if (!template.organizationId && template.isShared) return true
  return false
}

export async function setOrganizationLeadSheet(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string,
  subcategoryIds: string[]
): Promise<void> {
  await setOrganizationLeadSheetTemplateId(supabase, organizationId, templateId)
  await setOrganizationSubcategoryIds(supabase, organizationId, subcategoryIds)
}

export async function getOrganizationSubcategoryIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_subcategories")
    .select("subcategory_id")
    .eq("organization_id", organizationId)

  if (error) throw error
  return (data ?? []).map((r) => r.subcategory_id as string)
}

export async function getOrganizationCategoryIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_categories")
    .select("category_id")
    .eq("organization_id", organizationId)

  if (error) throw error
  return (data ?? []).map((r) => r.category_id as string)
}

export async function setOrganizationCategoryIds(
  supabase: SupabaseClient,
  organizationId: string,
  categoryIds: string[]
): Promise<void> {
  await supabase.from("organization_categories").delete().eq("organization_id", organizationId)

  if (categoryIds.length > 0) {
    const { error } = await supabase.from("organization_categories").insert(
      categoryIds.map((category_id) => ({
        organization_id: organizationId,
        category_id,
      }))
    )
    if (error) throw error
  }
}

export async function setOrganizationIndustries(
  supabase: SupabaseClient,
  organizationId: string,
  categoryIds: string[],
  subcategoryIds: string[]
): Promise<void> {
  await setOrganizationCategoryIds(supabase, organizationId, categoryIds)
  await setOrganizationSubcategoryIds(supabase, organizationId, subcategoryIds)
}
