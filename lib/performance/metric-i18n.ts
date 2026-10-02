import type { MessageKey } from "@/lib/i18n"
import type { MetricDefinition, MetricId } from "@/lib/performance/types"

type MetricCopy = {
  label: MessageKey
  description: MessageKey
  explanation?: MessageKey
  nullHint?: MessageKey
}

const METRIC_COPY: Record<MetricId, MetricCopy> = {
  revenue: { label: "metricRevenue", description: "metricRevenueDesc" },
  profit: { label: "metricProfit", description: "metricProfitDesc" },
  roas: {
    label: "metricRoas",
    description: "metricRoasDesc",
    explanation: "metricRoasExplanation",
    nullHint: "metricRoasNull",
  },
  cac: {
    label: "metricCac",
    description: "metricCacDesc",
    explanation: "metricCacExplanation",
    nullHint: "metricCacNull",
  },
  cpl: {
    label: "metricCpl",
    description: "metricCplDesc",
    explanation: "metricCplExplanation",
    nullHint: "metricCplNull",
  },
  adSpend: { label: "metricAdSpend", description: "metricAdSpendDesc" },
  closeRate: {
    label: "metricCloseRate",
    description: "metricCloseRateDesc",
    explanation: "metricCloseRateExplanation",
    nullHint: "metricCloseRateNull",
  },
  leads: { label: "metricLeads", description: "metricLeadsDesc" },
  customers: { label: "metricCustomers", description: "metricCustomersDesc" },
  ltv: {
    label: "metricLtv",
    description: "metricLtvDesc",
    explanation: "metricLtvExplanation",
    nullHint: "metricLtvNull",
  },
}

export function localizeMetric(
  metric: MetricDefinition,
  t: (key: MessageKey) => string
): MetricDefinition {
  const copy = METRIC_COPY[metric.id]
  return {
    ...metric,
    label: t(copy.label),
    description: t(copy.description),
    explanation: copy.explanation ? t(copy.explanation) : undefined,
    nullHint: copy.nullHint ? t(copy.nullHint) : undefined,
  }
}
