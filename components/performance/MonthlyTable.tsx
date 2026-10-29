"use client"

import { useMemo, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MetricBreakdownTable } from "@/components/performance/MetricBreakdownTable"
import type { Lead } from "@/lib/leads"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import { getYearOverview } from "@/lib/performance/get-performance"
import { sumTotals, tableMetrics, yearTotalsMetrics } from "@/lib/performance/metrics"
import type { ServiceId } from "@/lib/performance/services"
import type { MetricId } from "@/lib/performance/types"
import { filterVisibleMetrics } from "@/lib/performance/visible-metrics"

export function MonthlyTable({
  leads,
  adSpendByMonth,
  service,
  funnel,
  segment,
  years,
  hiddenMetrics = [],
}: {
  leads: readonly Lead[]
  adSpendByMonth: Record<string, number>
  service: ServiceId | null
  funnel: FunnelId | null
  segment: CustomerSegmentId | null
  /** Calendar years that have data; the current year is always offered too. */
  years: number[]
  hiddenMetrics?: readonly MetricId[]
}) {
  const { t } = useLanguage()
  const [now] = useState(() => new Date())
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const yearOptions = useMemo(
    () => [...new Set([...years, currentYear])].sort((a, b) => b - a),
    [currentYear, years]
  )

  const overview = useMemo(
    () =>
      getYearOverview(selectedYear, { service, funnel, segment }, { leads, adSpendByMonth }, now),
    [adSpendByMonth, funnel, leads, now, segment, selectedYear, service]
  )

  const last = overview.cumulativeBuckets.at(-1)
  const monthlyPeriodTotals = sumTotals(overview.monthlyBuckets)

  return (
    <Card className="dashboard-card dashboard-monthly-card gap-0 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 rounded-none px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            {t("dashboardMonthlyTitle")} {overview.year}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("dashboardMonthlySubtitle")}
          </p>
        </div>
        <Select
          value={String(selectedYear)}
          onValueChange={(value) => {
            if (typeof value === "string") setSelectedYear(Number(value))
          }}
        >
          <SelectTrigger
            className="dashboard-chip w-28 shrink-0"
            aria-label={t("dashboardMonthlyPickYear")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dashboard-filter-menu">
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <MetricBreakdownTable
          metrics={filterVisibleMetrics(tableMetrics(), hiddenMetrics)}
          monthBuckets={overview.monthlyBuckets}
          totalTotals={monthlyPeriodTotals}
        />
        <div className="border-t border-border px-6 py-5">
          <h3 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            {t("dashboardCumulativeTitle", { year: overview.year })}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("dashboardCumulativeSubtitle")}
          </p>
        </div>
        <MetricBreakdownTable
          metrics={filterVisibleMetrics(yearTotalsMetrics(), hiddenMetrics)}
          monthBuckets={overview.cumulativeBuckets}
          totalTotals={last}
          showTotal={Boolean(last)}
        />
      </CardContent>
    </Card>
  )
}
