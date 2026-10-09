"use client"

import { CombinedKpiCard, KpiCard } from "@/components/performance/KpiCard"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { localizeMetric } from "@/lib/performance/metric-i18n"
import { computeDelta, getMetric } from "@/lib/performance/metrics"
import type { MetricId } from "@/lib/performance/types"
import type { PerformanceDashboardData } from "@/lib/performance/types"

const KPI_GRID_ORDER: MetricId[] = ["revenue", "profit", "roas", "customers", "adSpend", "closeRate"]

export function KpiGrid({
  data,
  comparisonEnabled = false,
}: {
  data: PerformanceDashboardData
  comparisonEnabled?: boolean
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

  const cpl = cardProps("cpl")
  const leads = cardProps("leads")
  const ltv = cardProps("ltv")
  const cac = cardProps("cac")

  return (
    <section aria-label={t("dashboardKpiAria")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_GRID_ORDER.map((id) => (
          <KpiCard key={id} {...cardProps(id)} />
        ))}
        <CombinedKpiCard items={[cpl, leads]} />
        <CombinedKpiCard items={[ltv, cac]} />
      </div>
    </section>
  )
}
