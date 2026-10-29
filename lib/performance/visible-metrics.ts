import type { MetricDefinition, MetricId } from "./types"

/** KPI metrics a Censio admin may hide per client. Every other metric is always shown. */
export const HIDEABLE_METRIC_IDS: readonly MetricId[] = ["profit"]

/** The KPI grid is two rows of four cards; extra metrics are merged into half-width cards. */
export const KPI_TARGET_CARDS = 8

const SINGLE_KPI_IDS: readonly MetricId[] = [
  "revenue",
  "profit",
  "roas",
  "customers",
  "adSpend",
  "closeRate",
]

/** Pairs that share one card, in the order they are merged when there are too many metrics. */
const MERGE_GROUPS: readonly (readonly [MetricId, MetricId])[] = [
  ["cpl", "leads"],
  ["ltv", "cac"],
]

export type KpiCardLayout =
  | { kind: "single"; id: MetricId }
  | { kind: "pair"; ids: readonly [MetricId, MetricId] }

const hideableSet = new Set<string>(HIDEABLE_METRIC_IDS)

/** Keeps only known hideable metric ids (drops unknown values, duplicates, non-arrays). */
export function parseHiddenMetrics(value: unknown): MetricId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<MetricId>()
  for (const item of value) {
    if (typeof item === "string" && hideableSet.has(item)) seen.add(item as MetricId)
  }
  return [...seen]
}

export function isMetricVisible(id: MetricId, hidden: readonly MetricId[]): boolean {
  return !hidden.includes(id)
}

export function filterVisibleMetrics(
  metrics: MetricDefinition[],
  hidden: readonly MetricId[]
): MetricDefinition[] {
  if (hidden.length === 0) return metrics
  return metrics.filter((metric) => isMetricVisible(metric.id, hidden))
}

/**
 * Builds the KPI cards for the visible metrics. With more than 8 metrics the grid merges the
 * CPL + Leads pair first, then LTV + CAC; at 8 or fewer every metric gets its own card.
 */
export function buildKpiLayout(hidden: readonly MetricId[]): KpiCardLayout[] {
  const singles = SINGLE_KPI_IDS.filter((id) => isMetricVisible(id, hidden))
  const groups = MERGE_GROUPS.map((group) =>
    group.filter((id) => isMetricVisible(id, hidden))
  )
  const visibleCount = singles.length + groups.reduce((sum, group) => sum + group.length, 0)
  let merges = Math.max(0, visibleCount - KPI_TARGET_CARDS)

  const cards: KpiCardLayout[] = singles.map((id) => ({ kind: "single", id }))
  for (const group of groups) {
    if (group.length === 2 && merges > 0) {
      cards.push({ kind: "pair", ids: [group[0], group[1]] })
      merges -= 1
    } else {
      for (const id of group) cards.push({ kind: "single", id })
    }
  }
  return cards
}
