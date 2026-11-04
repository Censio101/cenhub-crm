import { FUNNEL_TARGET_PREFIX } from "@/lib/lead-sheet/mapping-review"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"
import { standardKeyForBuiltinColumn } from "@/lib/lead-sheet/webhook-fields"

/** @deprecated DB column; lead sheet no longer reads this. Kept for admin API types. */
export type FunnelSheetColumnProfile = "full" | "targets_and_pipeline"

export type FunnelFormViewConfig = {
  label: string
  webhookFieldTargets: readonly string[] | null
}

/** Lead sheet custom field for marketing platform / UTM source (label “Platform”). */
export const PLATFORM_CUSTOM_FIELD_KEY = "utm_source"

/** Always visible when Leadformular narrows columns (pipeline / CRM workflow). */
export const PIPELINE_BUILTIN_KEYS = new Set<BuiltinColumnKey>([
  "status",
  "wonDate",
  "salesPrice",
  "profit",
  "ltv",
])

function webhookKeyForBuiltin(builtinKey: BuiltinColumnKey): string | null {
  return standardKeyForBuiltinColumn(builtinKey)
}

function targetSet(targets: readonly string[] | null | undefined): Set<string> {
  if (!targets || targets.length === 0) return new Set()
  return new Set(targets)
}

/** True when this funnel uses an explicit subset (not “all eligible” / null). */
export function hasExplicitCompactWebhookTargets(
  webhookFieldTargets: readonly string[] | null | undefined
): boolean {
  return Array.isArray(webhookFieldTargets) && webhookFieldTargets.length > 0
}

/** Leadformular narrows columns when the funnel webhook field list is a subset. */
export function formSourceFilterNarrowsColumns(
  webhookFieldTargets: readonly string[] | null | undefined
): boolean {
  return hasExplicitCompactWebhookTargets(webhookFieldTargets)
}

/** Subset webhook targets + pipeline columns present on the template. */
export function columnsForCompactProfile(
  columns: readonly LeadSheetTemplateColumn[],
  webhookFieldTargets: readonly string[] | null | undefined
): LeadSheetTemplateColumn[] {
  const targets = targetSet(webhookFieldTargets)
  if (targets.size === 0) return [...columns]

  const platformTarget = `${FUNNEL_TARGET_PREFIX}${PLATFORM_CUSTOM_FIELD_KEY}`

  return columns.filter((col) => {
    if (col.kind === "builtin") {
      if (PIPELINE_BUILTIN_KEYS.has(col.builtinKey)) return true
      const webhookKey = webhookKeyForBuiltin(col.builtinKey)
      if (!webhookKey) return false
      return targets.has(webhookKey)
    }
    if (col.customField.fieldKey === PLATFORM_CUSTOM_FIELD_KEY) {
      return targets.has(platformTarget) || targets.size > 0
    }
    const customTarget = `${FUNNEL_TARGET_PREFIX}${col.customField.fieldKey}`
    return targets.has(customTarget)
  })
}

/** Puts Platform right after phone so both Leadformular views show it without scrolling. */
export function promotePlatformColumnAfterPhone(
  columns: readonly LeadSheetTemplateColumn[]
): LeadSheetTemplateColumn[] {
  const idx = columns.findIndex(
    (col) =>
      col.kind === "custom" && col.customField.fieldKey === PLATFORM_CUSTOM_FIELD_KEY
  )
  if (idx < 0) return [...columns]
  const phoneIdx = columns.findIndex((col) => col.kind === "builtin" && col.builtinKey === "phone")
  const insertAt = phoneIdx >= 0 ? phoneIdx + 1 : 0
  if (idx === insertAt) return [...columns]
  const next = [...columns]
  const [platform] = next.splice(idx, 1)
  next.splice(insertAt, 0, platform)
  return next
}

/**
 * When Leadformular picks a form: full template if that funnel sends all fields;
 * otherwise show only that funnel’s webhook field targets (+ pipeline).
 */
export function filterColumnsForFormSourceProfile(
  columns: readonly LeadSheetTemplateColumn[],
  formSource: string | "all",
  configsByLabel: ReadonlyMap<string, FunnelFormViewConfig> | null | undefined
): LeadSheetTemplateColumn[] {
  if (formSource === "all") return [...columns]
  const label = formSource.trim()
  const config = configsByLabel?.get(label)
  if (!config) return [...columns]

  const narrowed = !formSourceFilterNarrowsColumns(config.webhookFieldTargets)
    ? [...columns]
    : columnsForCompactProfile(columns, config.webhookFieldTargets)

  return promotePlatformColumnAfterPhone(narrowed)
}

export function funnelFormViewsToMap(
  views: readonly FunnelFormViewConfig[] | null | undefined
): Map<string, FunnelFormViewConfig> {
  const map = new Map<string, FunnelFormViewConfig>()
  if (!views) return map
  for (const view of views) {
    const label = view.label.trim()
    if (label) map.set(label, view)
  }
  return map
}
