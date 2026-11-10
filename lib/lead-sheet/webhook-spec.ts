import { activeSheetColumns } from "@/lib/lead-sheet/form-steps"
import {
  sheetEligibleCustomWebhookFields,
  sheetEligibleStandardWebhookKeys,
} from "@/lib/lead-sheet/webhook-fields"
import type {
  CustomFieldType,
  LeadSheetCustomFieldDef,
  ResolvedLeadSheetConfig,
} from "@/lib/lead-sheet/types"
import type { ClientService } from "@/lib/services/types"
import { CANONICAL_INBOUND_EXAMPLE } from "@/lib/leads/inbound-payload"

/** A custom lead-sheet column as the webhook expects it (inside `customFields`). */
export type WebhookCustomFieldSpec = {
  key: string
  label: string
  type: CustomFieldType
  required: boolean
  options?: string[]
}

/** Which lead sheet a client's webhooks currently follow. */
export type WebhookLeadSheetInfo = {
  templateId: string
  templateName: string
  isSystemDefault: boolean
  /** True when the sheet belongs to this client only (a "unique" sheet). */
  isClientOwned: boolean
  /** Standard top-level keys enabled on this client's sheet (before funnel subset). */
  standardFieldKeys: string[]
  customFields: WebhookCustomFieldSpec[]
}

export type StandardWebhookFieldType =
  "text" | "datetext" | "list" | "segment" | "platform" | "externalid" | "steps"

/** Fixed fields every webhook accepts, regardless of the lead sheet. */
export const STANDARD_WEBHOOK_FIELDS: {
  key: string
  type: StandardWebhookFieldType
  /** "recommended": the lead is still saved without it (with a warning). */
  required: "recommended" | "no"
}[] = [
  { key: "fullName", type: "text", required: "recommended" },
  { key: "email", type: "text", required: "recommended" },
  { key: "phone", type: "text", required: "recommended" },
  { key: "leadDate", type: "datetext", required: "no" },
  { key: "segment", type: "segment", required: "no" },
  { key: "serviceIds", type: "list", required: "no" },
  { key: "platform", type: "platform", required: "no" },
  { key: "companyName", type: "text", required: "no" },
  { key: "address", type: "text", required: "no" },
  { key: "zipCode", type: "text", required: "no" },
  { key: "city", type: "text", required: "no" },
  { key: "metaAdId", type: "text", required: "no" },
  { key: "externalId", type: "externalid", required: "no" },
  // Only offered when the lead sheet has the "Form steps" column (partial steps).
  { key: "stepsCompleted", type: "steps", required: "no" },
]

/** Label shown in funnel Map fields (mapping target key unchanged in saved JSON). */
export function webhookStandardFieldMapLabel(key: string): string {
  if (key === "segment") return "businesstype"
  return key
}

function toSpec(def: LeadSheetCustomFieldDef): WebhookCustomFieldSpec {
  return {
    key: def.fieldKey,
    label: def.label,
    type: def.fieldType,
    required: def.required,
    ...(def.fieldType === "select" ? { options: def.config.options ?? [] } : {}),
  }
}

export function buildWebhookLeadSheetInfo(
  config: ResolvedLeadSheetConfig | null
): WebhookLeadSheetInfo | null {
  if (!config) return null
  return {
    templateId: config.template.id,
    templateName: config.template.name,
    isSystemDefault: config.template.isSystemDefault,
    isClientOwned: config.template.organizationId !== null,
    standardFieldKeys: sheetEligibleStandardWebhookKeys(activeSheetColumns(config)),
    customFields: sheetEligibleCustomWebhookFields(activeSheetColumns(config)),
  }
}

/** Example JSON using only selected standard keys and custom fields. */
export function buildFilteredStandardInboundExample(
  services: readonly ClientService[],
  standardFieldKeys: readonly string[]
): Record<string, unknown> {
  const full = buildStandardInboundExample(services)
  const allowed = new Set(standardFieldKeys)
  const out: Record<string, unknown> = {}
  for (const key of standardFieldKeys) {
    if (key in full) out[key] = full[key]
  }
  if (!allowed.has("serviceIds") && "serviceIds" in out) delete out.serviceIds
  return out
}

export function exampleValueForField(field: WebhookCustomFieldSpec): unknown {
  switch (field.type) {
    case "number":
      return 5000
    case "date":
      return "2026-03-24"
    case "time":
      return "14:30"
    case "select":
      return field.options?.[0] ?? "Option"
    case "image":
      return { text: "Image 1", url: "https://example.com/photo.jpg" }
    case "textarea":
      return "Longer notes…"
    default:
      return "Example text"
  }
}

/** Enabled client services and inbound aliases for webhook `serviceIds`. */
export type WebhookServiceSpec = {
  /** Service slug stored on leads (`serviceIds`). */
  id: string
  nameDa: string
  nameEn: string
  aliases: string[]
}

export function buildWebhookServiceSpecs(
  services: readonly ClientService[],
  aliases: readonly { alias: string; serviceSlug: string }[]
): WebhookServiceSpec[] {
  const bySlug = new Map(services.map((s) => [s.id, s]))
  const aliasLists = new Map<string, string[]>()
  for (const row of aliases) {
    if (!bySlug.has(row.serviceSlug)) continue
    const list = aliasLists.get(row.serviceSlug) ?? []
    list.push(row.alias)
    aliasLists.set(row.serviceSlug, list)
  }
  return services.map((service) => ({
    id: service.id,
    nameDa: service.nameDa,
    nameEn: service.nameEn,
    aliases: aliasLists.get(service.id) ?? [],
  }))
}

/**
 * Make.com mapping-mode sample JSON — same CRM field names as fixed fields mode.
 * Make should build this shape (map Facebook → these keys). Paths in the Fields tab only
 * differ when the sender nests or renames keys.
 */
export function buildMappingInboundExample(
  services: readonly ClientService[]
): Record<string, unknown> {
  return buildFilteredMappingInboundExample(
    services,
    STANDARD_WEBHOOK_FIELDS.map((field) => field.key),
    []
  )
}

/**
 * CRM-keyed JSON for this funnel’s selected standard fields + `customFields.*`.
 * Static placeholder values only (e.g. Jane Doe) — never Make `{{…}}` templates.
 */
export function buildFilteredMappingInboundExample(
  services: readonly ClientService[],
  standardFieldKeys: readonly string[],
  customFields: readonly WebhookCustomFieldSpec[]
): Record<string, unknown> {
  const standard = buildFilteredStandardInboundExample(services, standardFieldKeys)
  return buildExamplePayload(standard, [...customFields])
}

/** Standard webhook example using this client's enabled service slugs. */
export function buildStandardInboundExample(
  services: readonly ClientService[]
): Record<string, unknown> {
  const base = CANONICAL_INBOUND_EXAMPLE as Record<string, unknown>
  const serviceIds =
    services.length > 0
      ? services.slice(0, Math.min(2, services.length)).map((s) => s.id)
      : (base.serviceIds as string[] | undefined)
  return { ...base, serviceIds }
}

/** Standard example body plus a `customFields` object matching the active lead sheet. */
export function buildExamplePayload(
  standard: Record<string, unknown>,
  customFields: WebhookCustomFieldSpec[]
): Record<string, unknown> {
  if (customFields.length === 0) return standard
  return {
    ...standard,
    customFields: Object.fromEntries(customFields.map((f) => [f.key, exampleValueForField(f)])),
  }
}

export function buildCurlExample(url: string, secret: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload).replace(/'/g, "'\\''")
  return [
    `curl -X POST '${url}'`,
    `  -H 'Authorization: Bearer ${secret}'`,
    `  -H 'Content-Type: application/json'`,
    `  -d '${body}'`,
  ].join(" \\\n")
}
