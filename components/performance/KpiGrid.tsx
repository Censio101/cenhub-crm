import { CombinedKpiCard, KpiCard } from "@/components/performance/KpiCard"
import { getMetric, kpiMetrics } from "@/lib/performance/metrics"
import type { PerformanceDashboardData } from "@/lib/performance/types"

const COMBINED_KPI_IDS = new Set(["ltv", "cac"])

function standaloneGridMetrics(
  metrics: ReturnType<typeof kpiMetrics>
): ReturnType<typeof kpiMetrics> {
  const standalone = metrics.filter((metric) => !COMBINED_KPI_IDS.has(metric.id))
  const adSpendIndex = standalone.findIndex((metric) => metric.id === "adSpend")
  const profitIndex = standalone.findIndex((metric) => metric.id === "profit")
  if (adSpendIndex === -1 || profitIndex === -1) {
    return standalone
  }

  const ordered = [...standalone]
  const [adSpend] = ordered.splice(adSpendIndex, 1)
  const insertAt =
    adSpendIndex < profitIndex ? profitIndex : profitIndex + 1
  ordered.splice(insertAt, 0, adSpend)
  return ordered
}

export function KpiGrid({ data }: { data: PerformanceDashboardData }) {
  const metrics = kpiMetrics()
  const standalone = standaloneGridMetrics(metrics)
  const ltv = getMetric("ltv")
  const cac = getMetric("cac")
  // Combined LTV+CAC sits where Annoncebudget used to: after CPL.
  const insertAfter = standalone.findIndex((metric) => metric.id === "cpl")
  const splitAt = insertAfter === -1 ? standalone.length - 1 : insertAfter + 1
  const leading = standalone.slice(0, splitAt)
  const trailing = standalone.slice(splitAt)

  function cardProps(metric: (typeof metrics)[number]) {
    return {
      metric,
      value: metric.compute(data.current.totals),
    }
  }

  return (
    <section aria-label="Nøgletal">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {leading.map((metric) => (
          <KpiCard key={metric.id} {...cardProps(metric)} />
        ))}
        <CombinedKpiCard items={[cardProps(ltv), cardProps(cac)]} />
        {trailing.map((metric) => (
          <KpiCard key={metric.id} {...cardProps(metric)} />
        ))}
      </div>
    </section>
  )
}
