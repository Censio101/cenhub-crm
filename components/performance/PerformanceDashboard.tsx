"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { DashboardMetricsSkeleton } from "@/components/client/ClientBoardSkeletons"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DashboardHeader } from "@/components/performance/DashboardHeader"
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/performance/DashboardStates"
import { LeadPipelineBar } from "@/components/leads/LeadPipelineBar"
import { DevelopmentChart } from "@/components/performance/DevelopmentChart"
import { KpiGrid } from "@/components/performance/KpiGrid"
import { MonthlyTable } from "@/components/performance/MonthlyTable"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useDashboardData } from "@/hooks/useDashboardData"
import { computeLeadPipelineStats, filterDashboardLeads } from "@/lib/leads"
import { parseIsoDate } from "@/lib/performance/date-ranges"
import { formatDateRangeLabel } from "@/lib/performance/format"
import { getLeadDataDateRange } from "@/lib/performance/from-leads"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"

export function PerformanceDashboard() {
  const router = useRouter()
  const { locale, t } = useLanguage()
  const {
    leads,
    adSpendByMonth,
    loading: dataLoading,
    error,
    reload,
  } = useDashboardData()
  const leadDateSpan = useMemo(() => getLeadDataDateRange(leads), [leads])
  const comparisonAnchor = useMemo(
    () => (leadDateSpan?.start ? parseIsoDate(leadDateSpan.start) : null),
    [leadDateSpan]
  )
  const {
    view,
    pending,
    onPresetChange,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
    onMetricChange,
  } = useDashboardViewState("/", comparisonAnchor)
  const measuredRange = useMemo(
    () =>
      view.preset === "all_time" && comparisonAnchor
        ? { start: comparisonAnchor, end: view.range.end }
        : view.range,
    [comparisonAnchor, view.preset, view.range]
  )
  // "Select client" is handled by the route gate; every other error is a failed load.
  const loadError = error && error !== "leadsSelectClient" ? error : null
  const [chartYear, setChartYear] = useState<number | null>(null)

  const data = useMemo(() => {
    if (dataLoading) return null
    try {
      const result = getPerformanceDashboard(
        {
          range: measuredRange,
          comparison: view.comparisonEnabled ? view.comparisonRange : null,
          service: view.service,
          funnel: view.funnel,
          segment: view.segment,
        },
        { leads, adSpendByMonth },
        chartYear != null ? { chartYear } : undefined
      )
      return result
    } catch {
      return null
    }
  }, [view, leads, adSpendByMonth, dataLoading, measuredRange, chartYear])

  useEffect(() => {
    if (!data) return
    setChartYear((prev) => {
      if (prev != null && data.chartYears.includes(prev)) return prev
      if (data.chartYears.includes(data.year.year)) return data.year.year
      return data.chartYears[data.chartYears.length - 1] ?? data.year.year
    })
  }, [data?.chartYears, data?.year.year])

  const pipelineStats = useMemo(
    () =>
      computeLeadPipelineStats(
        filterDashboardLeads(leads, {
          range: measuredRange,
          service: view.service,
          funnel: view.funnel,
          segment: view.segment,
        })
      ),
    [view, leads]
  )

  const chartCurrentLabel = data != null ? String(data.year.year) : String(measuredRange.end.getFullYear())
  const chartComparisonLabel =
    view.comparisonEnabled &&
    view.comparisonRange &&
    view.comparisonRange.start.getFullYear() >= 2000 &&
    data?.comparison
      ? formatDateRangeLabel(view.comparisonRange.start, view.comparisonRange.end, locale)
      : null

  const header = (
    <DashboardHeader
      preset={view.preset}
      range={view.range}
      comparisonEnabled={view.comparisonEnabled}
      comparisonMode={view.comparisonMode}
      comparisonRange={view.comparisonRange}
      onPresetChange={onPresetChange}
      onCustomRange={onCustomRange}
      onComparisonChange={onComparisonChange}
      service={view.service}
      onServiceChange={onServiceChange}
      funnel={view.funnel}
      onFunnelChange={onFunnelChange}
      segment={view.segment}
      onSegmentChange={onSegmentChange}
      earliestLeadDate={leadDateSpan?.start}
      latestLeadDate={leadDateSpan?.end}
    />
  )

  return (
    <AdminClientRouteGate>
      <div className="flex w-full flex-col gap-8">
        {header}

        {dataLoading ? (
          <DashboardMetricsSkeleton />
        ) : data == null || (loadError && leads.length === 0) ? (
          <DashboardErrorState onRetry={() => (loadError ? void reload() : router.refresh())} />
        ) : (
          <ClientBoardEnter className="flex w-full flex-col gap-8" pending={pending}>
            {pending ? (
              <span className="sr-only">{t("dashboardUpdating")}</span>
            ) : null}

            {loadError ? (
              <LoadErrorNotice message={t(loadError)} onRetry={() => void reload()} />
            ) : null}

            {data.status === "empty" ? (
              <>
                <KpiGrid data={data} comparisonEnabled={view.comparisonEnabled} />
                <DashboardEmptyState />
              </>
            ) : (
              <>
                <KpiGrid data={data} comparisonEnabled={view.comparisonEnabled} />
                <DevelopmentChart
                  data={data}
                  metricId={view.metric}
                  currentLabel={chartCurrentLabel}
                  comparisonLabel={chartComparisonLabel}
                  compareActive={view.comparisonEnabled}
                  chartYears={data.chartYears}
                  chartYear={data.year.year}
                  onChartYearChange={setChartYear}
                  onMetricChange={onMetricChange}
                />
                <LeadPipelineBar
                  stats={pipelineStats}
                  description={t("dashboardPipelinePeriod")}
                />
                <MonthlyTable data={data} />
              </>
            )}

            <section
              id="performance-secondary"
              aria-label={t("dashboardSecondaryAria")}
              className="hidden"
            />
          </ClientBoardEnter>
        )}
      </div>
    </AdminClientRouteGate>
  )
}