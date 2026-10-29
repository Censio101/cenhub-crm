"use client"

import { CombinedKpiCard, KpiCard } from "@/components/performance/KpiCard"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { localizeMetric } from "@/lib/performance/metric-i18n"
import { computeDelta, getMetric } from "@/lib/performance/metrics"
import type { MetricId } from "@/lib/performance/types"
import type { PerformanceDashboardData } from "@/lib/performance/types"
import { buildKpiLayout } from "@/lib/performance/visible-metrics"

export function KpiGrid({
  data,
  comparisonEnabled = false,
  hiddenMetrics = [],
}: {
  data: PerformanceDashboardData
  comparisonEnabled?: boolean
  hiddenMetrics?: readonly MetricId[]
}) {
  const { t } = useLanguage()
  const compareEmpty = comparisonEnabled && data.comparison == null

  function cardProps(id: MetricId) {
    const metric = localizeMetric(getMetric(id), t)
    const value = metric.compute(data.current.totals)
    const previous = data.comparison ? metric.compute(data.comparison.totals) : null
    return {
      metric,
      value,
      delta:
        comparisonEnabled && data.comparison
          ? computeDelta(value, previous, metric.positiveDirection)
          : null,
      compareEmpty,
    }
  }

  const cards = buildKpiLayout(hiddenMetrics)

  return (
    <section aria-label={t("dashboardKpiAria")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) =>
          card.kind === "single" ? (
            <KpiCard key={card.id} {...cardProps(card.id)} />
          ) : (
            <CombinedKpiCard key={card.ids.join("-")} items={card.ids.map(cardProps)} />
          )
        )}
      </div>
    </section>
  )
}
