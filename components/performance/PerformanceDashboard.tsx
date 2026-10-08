"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { DashboardMetricsSkeleton } from "@/components/client/ClientBoardSkeletons"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DashboardHeader } from "@/components/performance/DashboardHeader"
import {
  DashboardEmptyState,
  DashboardErrorState,
  PartialDataNotice,
} from "@/components/performance/DashboardStates"
import { LeadPipelineBar } from "@/components/leads/LeadPipelineBar"
import { DevelopmentChart } from "@/components/performance/DevelopmentChart"
import { KpiGrid } from "@/components/performance/KpiGrid"
import { MonthlyTable } from "@/components/performance/MonthlyTable"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useDashboardData } from "@/hooks/useDashboardData"
import { computeLeadPipelineStats, filterDashboardLeads } from "@/lib/leads"
import { currentSeriesLabel, comparisonSeriesLabel } from "@/lib/performance/compare"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"

export function PerformanceDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
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
  } = useDashboardViewState("/")
  const {
    leads,
    adSpendByMonth,
    loading: dataLoading,
    error,
    reload,
  } = useDashboardData()
  // "Select client" is handled by the route gate; every other error is a failed load.
  const loadError = error && error !== "leadsSelectClient" ? error : null

  const data = useMemo(() => {
    if (dataLoading) return null
    try {
      return getPerformanceDashboard(
        {
          range: view.range,
          comparison: view.comparisonEnabled ? view.comparisonRange : null,
          service: view.service,
          funnel: view.funnel,
          segment: view.segment,
        },
        { leads, adSpendByMonth }
      )
    } catch {
      return null
    }
  }, [view, leads, adSpendByMonth, dataLoading])

  const pipelineStats = useMemo(
    () =>
      computeLeadPipelineStats(
        filterDashboardLeads(leads, {
          range: view.range,
          service: view.service,
          funnel: view.funnel,
          segment: view.segment,
        })
      ),
    [view, leads]
  )

  const chartCurrentLabel = currentSeriesLabel(view.range)
  const chartComparisonLabel =
    view.comparisonEnabled && view.comparisonRange && data?.comparison
      ? view.comparisonMode === "custom"
        ? t("dashboardChartBefore")
        : comparisonSeriesLabel(view.comparisonRange, t("dashboardChartComparison"))
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

            {data.status === "partial" ? <PartialDataNotice /> : null}

            {data.status === "empty" ? (
              <>
                <KpiGrid data={data} />
                <DashboardEmptyState />
              </>
            ) : (
              <>
                <KpiGrid data={data} />
                <DevelopmentChart
                  data={data}
                  metricId={view.metric}
                  currentLabel={chartCurrentLabel}
                  comparisonLabel={chartComparisonLabel}
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