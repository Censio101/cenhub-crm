import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MetricBreakdownTable } from "@/components/performance/MetricBreakdownTable"
import { tableMetrics, yearTotalsMetrics } from "@/lib/performance/metrics"
import type { PerformanceDashboardData } from "@/lib/performance/types"

export function MonthlyTable({ data }: { data: PerformanceDashboardData }) {
  const last = data.year.cumulativeBuckets.at(-1)

  return (
    <Card className="dashboard-card dashboard-monthly-card gap-0 py-0">
      <CardHeader className="rounded-none px-6 py-5">
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          Månedsopdeling
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Omsætning, bundlinje POAS, leads, lukkede kunder, lukke rate og LTV
          pr. måned
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <MetricBreakdownTable
          metrics={tableMetrics()}
          monthBuckets={data.current.monthlyBuckets}
          totalTotals={data.current.totals}
        />
        <div className="border-t border-border px-6 py-5">
          <h3 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Akkumuleret {data.year.year}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Omsætning, bundlinje POAS, leads, lukkede kunder, lukke rate og LTV
            fra januar og månedsvis frem gennem året
          </p>
        </div>
        <MetricBreakdownTable
          metrics={yearTotalsMetrics()}
          monthBuckets={data.year.cumulativeBuckets}
          totalTotals={last}
          showTotal={Boolean(last)}
        />
      </CardContent>
    </Card>
  )
}
