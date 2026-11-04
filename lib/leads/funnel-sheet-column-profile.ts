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

/** Shown in compact Leadformular views even when not in webhook targets (Scantherm stepped forms). */
export const COMPACT_ALWAYS_BUILTIN_KEYS = new Set<BuiltinColumnKey>(["formProgress"])

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
      if (COMPACT_ALWAYS_BUILTIN_KEYS.has(col.builtinKey)) return true
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

/** Puts Platform immediately after Form steps (fallback: before pipeline columns). */
export function promotePlatformColumnAfterFormProgress(
  columns: readonly LeadSheetTemplateColumn[]
): LeadSheetTemplateColumn[] {
  const idx = columns.findIndex(
    (col) =>
      col.kind === "custom" && col.customField.fieldKey === PLATFORM_CUSTOM_FIELD_KEY
  )
  if (idx < 0) return [...columns]

  const formIdx = columns.findIndex(
    (col) => col.kind === "builtin" && col.builtinKey === "formProgress"
  )
  let insertAt: number
  if (formIdx >= 0) {
    insertAt = formIdx + 1
  } else {
    const firstPipeline = columns.findIndex(
      (col) => col.kind === "builtin" && PIPELINE_BUILTIN_KEYS.has(col.builtinKey)
    )
    insertAt = firstPipeline >= 0 ? firstPipeline : columns.length
  }

  if (idx === insertAt) return [...columns]
  const next = [...columns]
  const [platform] = next.splice(idx, 1)
  if (insertAt > idx) insertAt -= 1
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

  if (!formSourceFilterNarrowsColumns(config.webhookFieldTargets)) {
    return [...columns]
  }

  return columnsForCompactProfile(columns, config.webhookFieldTargets)
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
