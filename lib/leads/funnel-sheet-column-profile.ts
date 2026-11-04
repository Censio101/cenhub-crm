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

  return columns.filter((col) => {
    if (col.kind === "builtin") {
      if (PIPELINE_BUILTIN_KEYS.has(col.builtinKey)) return true
      const webhookKey = webhookKeyForBuiltin(col.builtinKey)
      if (!webhookKey) return false
      return targets.has(webhookKey)
    }
    const customTarget = `${FUNNEL_TARGET_PREFIX}${col.customField.fieldKey}`
    return targets.has(customTarget)
  })
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
