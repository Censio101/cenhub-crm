import type {
  CustomFieldType,
  LeadSheetCustomFieldDef,
  ResolvedLeadSheetConfig,
} from "@/lib/lead-sheet/types"

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
  customFields: WebhookCustomFieldSpec[]
}

export type StandardWebhookFieldType =
  "text" | "datetext" | "list" | "segment" | "platform" | "externalid"

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
]

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
    customFields: config.columns.flatMap((col) =>
      col.kind === "custom" ? [toSpec(col.customField)] : []
    ),
  }
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
