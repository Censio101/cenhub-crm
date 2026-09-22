import type {
  MetricDefinition,
  MetricDelta,
  MetricId,
  PerformanceBucket,
  PeriodTotals,
  PositiveDirection,
} from "./types"

export function safeDivide(
  numerator: number,
  denominator: number
): number | null {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null
  }
  const result = numerator / denominator
  return Number.isFinite(result) ? result : null
}

export function computeProfit(totals: PeriodTotals): number {
  if (totals.profit != null && Number.isFinite(totals.profit)) {
    return totals.profit
  }
  return totals.revenue - totals.adSpend
}

export const METRICS: MetricDefinition[] = [
  {
    id: "revenue",
    label: "Omsætning",
    description: "Omsætning fra kunder i den valgte periode.",
    format: "currency",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    emphasizePositive: true,
    compute: (totals) => totals.revenue,
  },
  {
    id: "profit",
    label: "Bundlinje POAS",
    description:
      "Resultat for perioden. Kan senere beregnes med flere omkostninger end annoncer.",
    format: "currency",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    emphasizePositive: true,
    compute: computeProfit,
  },
  {
    id: "cac",
    label: "CAC",
    explanation: "Pris pr. lukket kunde",
    description: "Pris pr. lukket kunde. Den gennemsnitlige annonceudgift for at skaffe én kunde.",
    format: "currency",
    positiveDirection: "down",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: false,
    nullHint: "Ingen kunder i perioden",
    compute: (totals) => safeDivide(totals.adSpend, totals.customers),
  },
  {
    id: "cpl",
    label: "CPL",
    explanation: "Pris pr. lead",
    description: "Pris pr. lead. Den gennemsnitlige annonceudgift pr. lead.",
    format: "currency",
    positiveDirection: "down",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: false,
    nullHint: "Ingen leads i perioden",
    compute: (totals) => safeDivide(totals.adSpend, totals.leads),
  },
  {
    id: "adSpend",
    label: "Annoncebudget",
    description: "Samlet annonceudgift i den valgte periode.",
    format: "currency",
    positiveDirection: "neutral",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: false,
    compute: (totals) => totals.adSpend,
  },
  {
    id: "closeRate",
    label: "Close rate",
    explanation: "Lukke rate i %",
    description: "Andelen af leads der ender som kunder.",
    format: "percent",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    nullHint: "Ingen leads i perioden",
    compute: (totals) => {
      const rate = safeDivide(totals.customers, totals.leads)
      return rate == null ? null : rate * 100
    },
  },
  {
    id: "leads",
    label: "Leads",
    description: "Antal leads i den valgte periode.",
    format: "integer",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    compute: (totals) => totals.leads,
  },
  {
    id: "customers",
    label: "Lukkede kunder",
    description: "Antal kunder der er lukket i den valgte periode.",
    format: "integer",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    emphasizePositive: true,
    compute: (totals) => totals.customers,
  },
  {
    id: "ltv",
    label: "LTV",
    explanation: "Life time value",
    description: "Life time value. Gennemsnitlig omsætning pr. lukket kunde i perioden.",
    format: "currency",
    positiveDirection: "up",
    showInKpiGrid: true,
    showInChart: true,
    showInTable: true,
    showInYearTotals: true,
    emphasizePositive: true,
    nullHint: "Ingen lukkede kunder i perioden",
    compute: (totals) => safeDivide(totals.revenue, totals.customers),
  },
]

const metricById = new Map(METRICS.map((metric) => [metric.id, metric]))

export function getMetric(id: MetricId): MetricDefinition {
  const metric = metricById.get(id)
  if (!metric) {
    throw new Error(`Unknown metric: ${id}`)
  }
  return metric
}

export function isMetricId(value: string): value is MetricId {
  return metricById.has(value as MetricId)
}

export const KPI_CARD_ORDER = [
  "revenue",
  "profit",
  "ltv",
  "customers",
  "leads",
  "cac",
  "cpl",
  "adSpend",
  "closeRate",
] as const

function metricsInOrder(
  order: readonly MetricId[],
  visible: (metric: MetricDefinition) => boolean
): MetricDefinition[] {
  const ordered = order
    .map((id) => getMetric(id))
    .filter(visible)
  const seen = new Set(ordered.map((metric) => metric.id))
  const rest = METRICS.filter((metric) => visible(metric) && !seen.has(metric.id))
  return [...ordered, ...rest]
}

export function kpiMetrics(): MetricDefinition[] {
  return metricsInOrder(KPI_CARD_ORDER, (metric) => metric.showInKpiGrid)
}

export function chartMetrics(): MetricDefinition[] {
  return metricsInOrder(KPI_CARD_ORDER, (metric) => metric.showInChart)
}

const TABLE_METRIC_IDS = [
  "revenue",
  "profit",
  "leads",
  "customers",
  "closeRate",
  "ltv",
] as const

export function tableMetrics(): MetricDefinition[] {
  return TABLE_METRIC_IDS.map((id) => getMetric(id))
}

export function yearTotalsMetrics(): MetricDefinition[] {
  return TABLE_METRIC_IDS.map((id) => getMetric(id))
}

export function emptyTotals(): PeriodTotals {
  return {
    leads: 0,
    customers: 0,
    b2bCustomers: 0,
    b2cCustomers: 0,
    revenue: 0,
    adSpend: 0,
    profit: null,
    qualified: 0,
    quotes: 0,
  }
}

export function sumTotals(buckets: PeriodTotals[]): PeriodTotals {
  return buckets.reduce<PeriodTotals>(
    (acc, bucket) => {
      const hasProfitOverride =
        acc.profit != null || bucket.profit != null
      return {
        leads: acc.leads + bucket.leads,
        customers: acc.customers + bucket.customers,
        b2bCustomers: (acc.b2bCustomers ?? 0) + (bucket.b2bCustomers ?? 0),
        b2cCustomers: (acc.b2cCustomers ?? 0) + (bucket.b2cCustomers ?? 0),
        revenue: acc.revenue + bucket.revenue,
        adSpend: acc.adSpend + bucket.adSpend,
        profit: hasProfitOverride
          ? (acc.profit ?? 0) + computeProfit(bucket)
          : null,
        qualified: (acc.qualified ?? 0) + (bucket.qualified ?? 0),
        quotes: (acc.quotes ?? 0) + (bucket.quotes ?? 0),
      }
    },
    emptyTotals()
  )
}

export function accumulateMonthly(
  buckets: PerformanceBucket[]
): PerformanceBucket[] {
  let running = emptyTotals()
  return buckets.map((bucket) => {
    running = sumTotals([running, bucket])
    return {
      ...running,
      start: bucket.start,
      end: bucket.end,
    }
  })
}

export function computeDelta(
  current: number | null,
  previous: number | null,
  positiveDirection: PositiveDirection
): MetricDelta {
  if (current == null || previous == null) {
    return {
      absolute: null,
      percent: null,
      direction: "unknown",
      isPositive: null,
    }
  }

  const absolute = current - previous
  const percent =
    previous === 0
      ? current === 0
        ? 0
        : null
      : (absolute / Math.abs(previous)) * 100

  const direction =
    absolute > 0 ? "up" : absolute < 0 ? "down" : "flat"

  let isPositive: boolean | null = null
  if (positiveDirection !== "neutral" && direction !== "flat") {
    isPositive =
      positiveDirection === "up" ? direction === "up" : direction === "down"
  }

  return { absolute, percent, direction, isPositive }
}
