"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MetricBreakdownTable } from "@/components/performance/MetricBreakdownTable"
import { sumTotals, tableMetrics, yearTotalsMetrics } from "@/lib/performance/metrics"
import type { PerformanceDashboardData } from "@/lib/performance/types"

export function MonthlyTable({ data }: { data: PerformanceDashboardData }) {
  const { t } = useLanguage()
  const last = data.year.cumulativeBuckets.at(-1)
  const monthlyPeriodTotals = sumTotals(data.year.monthlyBuckets)

  return (
    <Card className="dashboard-card dashboard-monthly-card gap-0 py-0">
      <CardHeader className="rounded-none px-6 py-5">
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          {t("dashboardMonthlyTitle")}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("dashboardMonthlySubtitle")}
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <MetricBreakdownTable
          metrics={tableMetrics()}
          monthBuckets={data.year.monthlyBuckets}
          totalTotals={monthlyPeriodTotals}
        />
        <div className="border-t border-border px-6 py-5">
          <h3 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            {t("dashboardCumulativeTitle", { year: data.year.year })}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("dashboardCumulativeSubtitle")}
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
