"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
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
  const { leads, adSpendByMonth, error, needsClientSelection } = useDashboardData()

  const data = useMemo(() => {
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
  }, [view, leads, adSpendByMonth])

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
        : comparisonSeriesLabel(view.comparisonRange)
      : null

  if (needsClientSelection) {
    return <SelectClientEmptyState />
  }

  if (data == null) {
    return (
      <DashboardErrorState
        onRetry={() => router.refresh()}
      />
    )
  }

  return (
    <div className="flex w-full flex-col gap-8">
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

      {pending ? (
        <span className="sr-only">{t("dashboardUpdating")}</span>
      ) : null}

      {error ? (
        <p className="text-xs text-muted-foreground" role="status">
          {error}
        </p>
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
    </div>
  )
}
