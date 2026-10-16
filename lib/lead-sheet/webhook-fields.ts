import { FUNNEL_TARGET_PREFIX } from "@/lib/lead-sheet/mapping-review"
import type {
  LeadSheetCustomFieldDef,
  LeadSheetTemplateColumn,
  ResolvedLeadSheetConfig,
} from "@/lib/lead-sheet/types"
import {
  STANDARD_WEBHOOK_FIELDS,
  type WebhookCustomFieldSpec,
  type WebhookLeadSheetInfo,
} from "@/lib/lead-sheet/webhook-spec"

/** Built-in sheet column → top-level webhook field (when present on the sheet). */
export const BUILTIN_TO_WEBHOOK_STANDARD: Partial<
  Record<
    LeadSheetTemplateColumn extends { kind: "builtin"; builtinKey: infer K } ? K : never,
    string
  >
> = {
  fullName: "fullName",
  email: "email",
  phone: "phone",
  date: "leadDate",
  segment: "segment",
  companyName: "companyName",
  address: "address",
  zipCode: "zipCode",
  city: "city",
  serviceIds: "serviceIds",
  metaAdId: "metaAdId",
}

/** Standard fields always offered even when there is no matching sheet column. */
export const EXTRA_STANDARD_WEBHOOK_KEYS = ["platform", "externalId"] as const

const LOCKED_WEBHOOK_STANDARD = new Set(["fullName", "email", "phone"])

export function standardKeyForBuiltinColumn(
  builtinKey: string
): string | null {
  return (BUILTIN_TO_WEBHOOK_STANDARD as Record<string, string | undefined>)[builtinKey] ?? null
}

/** Standard webhook keys enabled by this template's columns (+ extras). */
export function sheetEligibleStandardWebhookKeys(
  columns: readonly LeadSheetTemplateColumn[]
): string[] {
  const keys = new Set<string>(LOCKED_WEBHOOK_STANDARD)
  for (const col of columns) {
    if (col.kind === "builtin") {
      const mapped = standardKeyForBuiltinColumn(col.builtinKey)
      if (mapped) keys.add(mapped)
    }
  }
  for (const extra of EXTRA_STANDARD_WEBHOOK_KEYS) keys.add(extra)
  return STANDARD_WEBHOOK_FIELDS.map((f) => f.key).filter((key) => keys.has(key))
}

export function sheetEligibleCustomWebhookFields(
  columns: readonly LeadSheetTemplateColumn[]
): WebhookCustomFieldSpec[] {
  return columns.flatMap((col) => {
    if (col.kind !== "custom") return []
    const def = col.customField
    return [
      {
        key: def.fieldKey,
        label: def.label,
        type: def.fieldType,
        required: def.required,
        ...(def.fieldType === "select" ? { options: def.config.options ?? [] } : {}),
      },
    ]
  })
}

export type EffectiveWebhookFields = {
  standardFieldKeys: string[]
  customFields: WebhookCustomFieldSpec[]
  includeServiceIds: boolean
}

/** Sheet-level eligibility intersected with an optional per-funnel target list. */
export function effectiveWebhookFields(
  sheet: WebhookLeadSheetInfo,
  funnelTargets: readonly string[] | null | undefined
): EffectiveWebhookFields {
  const eligibleStandard = new Set(sheet.standardFieldKeys)
  const eligibleCustom = sheet.customFields
  const eligibleCustomKeys = new Set(eligibleCustom.map((f) => f.key))

  const allTargets: string[] = [
    ...sheet.standardFieldKeys,
    ...eligibleCustom.map((f) => `${FUNNEL_TARGET_PREFIX}${f.key}`),
  ]

  const selected =
    funnelTargets && funnelTargets.length > 0
      ? funnelTargets.filter((t) => allTargets.includes(t))
      : allTargets

  const selectedStandard = selected.filter((t) => !t.startsWith(FUNNEL_TARGET_PREFIX))
  const standardFieldKeys = sheet.standardFieldKeys.filter(
    (k) => selectedStandard.includes(k) && eligibleStandard.has(k)
  )
  const customFields = eligibleCustom.filter((f) =>
    selected.includes(`${FUNNEL_TARGET_PREFIX}${f.key}`)
  )

  return {
    standardFieldKeys,
    customFields,
    includeServiceIds: standardFieldKeys.includes("serviceIds"),
  }
}

export function allEligibleWebhookTargets(sheet: WebhookLeadSheetInfo): string[] {
  return [
    ...sheet.standardFieldKeys,
    ...sheet.customFields.map((f) => `${FUNNEL_TARGET_PREFIX}${f.key}`),
  ]
}

export function listCustomFieldDefsForWebhook(
  columns: readonly LeadSheetTemplateColumn[]
): LeadSheetCustomFieldDef[] {
  return columns
    .filter((c): c is Extract<LeadSheetTemplateColumn, { kind: "custom" }> => c.kind === "custom")
    .map((c) => c.customField)
}

export function customFieldDefsForFunnel(
  config: ResolvedLeadSheetConfig,
  sheet: WebhookLeadSheetInfo,
  funnelTargets: readonly string[] | null | undefined
): LeadSheetCustomFieldDef[] {
  const allowed = new Set(
    effectiveWebhookFields(sheet, funnelTargets).customFields.map((f) => f.key)
  )
  return listCustomFieldDefsForWebhook(config.columns).filter((def) => allowed.has(def.fieldKey))
}
