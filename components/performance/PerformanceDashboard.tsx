"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { ClientCorePageShell } from "@/components/client/ClientCorePageShell"
import { useClientNavigation } from "@/components/client/ClientNavigationProvider"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { ClientBoardLoadingState } from "@/components/client/ClientBoardLoadingState"
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
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useDashboardData } from "@/hooks/useDashboardData"
import { toIsoDate } from "@/lib/performance/date-ranges"
import { formatDateRangeLabel } from "@/lib/performance/format"
import { getLeadDataDateRange } from "@/lib/performance/from-leads"
import { resolveAllTimeStart, resolveMeasuredRange } from "@/lib/performance/all-time"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"
import { isMetaMetricsStale } from "@/lib/meta/sync-center-constants"
import {
  dashboardPipelineStats,
  filterWonLeadsByCloseDate,
} from "@/lib/performance/won-financials"
import { countWonLeadsMissingSalesPrice } from "@/lib/leads/won-sales-price"

export function PerformanceDashboard() {
  const router = useRouter()
  const { locale, t } = useLanguage()
  const { role, organization } = useActiveOrganization()
  const hiddenMetrics = useMemo(
    () => organization?.dashboardHiddenMetrics ?? [],
    [organization?.dashboardHiddenMetrics]
  )
  const { animateBoardEnter, markWorkspaceWarm } = useClientNavigation()
  const {
    leads,
    adSpendByMonth,
    adSpendSource,
    metaEnabled,
    metaLastSyncedAt,
    loading: dataLoading,
    error,
    reload,
  } = useDashboardData()
  const leadDateSpan = useMemo(() => getLeadDataDateRange(leads), [leads])
  // Where this client's history begins (first lead or first ad-spend month).
  const comparisonAnchor = useMemo(
    () => resolveAllTimeStart({ leads, adSpendByMonth }),
    [adSpendByMonth, leads]
  )
  const {
    view,
    pending,
    onPresetChange,
    onPresetForComparison,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
    onMetricChange,
  } = useDashboardViewState("/", comparisonAnchor)
  // "All time" starts at the earliest lead or ad-spend month, so earlier ad budget still counts.
  const measuredRange = useMemo(
    () => resolveMeasuredRange(view.preset, view.range, { leads, adSpendByMonth }),
    [adSpendByMonth, leads, view.preset, view.range]
  )
  // "Select client" is handled by the route gate; every other error is a failed load.
  const loadError = error && error !== "leadsSelectClient" ? error : null

  useEffect(() => {
    if (!dataLoading) markWorkspaceWarm()
  }, [dataLoading, markWorkspaceWarm])

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
        { leads, adSpendByMonth }
      )
      return result
    } catch {
      return null
    }
  }, [view, leads, adSpendByMonth, dataLoading, measuredRange])

  const pipelineStats = useMemo(
    () =>
      dashboardPipelineStats(leads, measuredRange, {
        service: view.service,
        funnel: view.funnel,
        segment: view.segment,
      }),
    [measuredRange, view, leads]
  )

  const adSpendNotice = useMemo(() => {
    if (!metaEnabled) return null
    if (adSpendSource === "pending") {
      return role === "censio_admin"
        ? t("dashboardAdSpendPendingAdmin")
        : t("dashboardAdSpendPending")
    }
    if (isMetaMetricsStale(metaLastSyncedAt)) return t("dashboardAdSpendStale")
    return null
  }, [adSpendSource, metaEnabled, metaLastSyncedAt, role, t])

  const missingSalesPriceCount = useMemo(
    () => countWonLeadsMissingSalesPrice(filterWonLeadsByCloseDate(leads, measuredRange)),
    [leads, measuredRange]
  )

  // A hidden metric in the URL (old link) falls back to revenue.
  const chartMetricId = hiddenMetrics.includes(view.metric) ? "revenue" : view.metric
  const chartComparisonLabel =
    view.comparisonEnabled &&
    view.comparisonRange &&
    view.comparisonRange.start.getFullYear() >= 2000 &&
    data?.comparison
      ? formatDateRangeLabel(view.comparisonRange.start, view.comparisonRange.end, locale)
      : null
  const chartCurrentLabel = chartComparisonLabel
    ? formatDateRangeLabel(measuredRange.start, measuredRange.end, locale)
    : String(measuredRange.end.getFullYear())

  const header = (
    <DashboardHeader
      preset={view.preset}
      range={view.range}
      comparisonEnabled={view.comparisonEnabled}
      comparisonMode={view.comparisonMode}
      comparisonRange={view.comparisonRange}
      onPresetChange={onPresetChange}
      onPresetForComparison={onPresetForComparison}
      onCustomRange={onCustomRange}
      onComparisonChange={onComparisonChange}
      service={view.service}
      onServiceChange={onServiceChange}
      funnel={view.funnel}
      onFunnelChange={onFunnelChange}
      segment={view.segment}
      onSegmentChange={onSegmentChange}
      earliestLeadDate={comparisonAnchor ? toIsoDate(comparisonAnchor) : null}
      latestLeadDate={leadDateSpan?.end}
    />
  )

  return (
    <AdminClientRouteGate>
      <ClientCorePageShell header={header} bodyClassName="gap-8">
        {dataLoading ? (
          <ClientBoardLoadingState variant="dashboard" />
        ) : data == null || (loadError && leads.length === 0) ? (
          <DashboardErrorState onRetry={() => (loadError ? void reload() : router.refresh())} />
        ) : (
          <ClientBoardEnter
            className="client-core-settle-stack flex w-full flex-col gap-8"
            pending={pending}
            animateEnter={animateBoardEnter}
          >
            {pending ? (
              <span className="sr-only">{t("dashboardUpdating")}</span>
            ) : null}

            {loadError ? (
              <LoadErrorNotice message={t(loadError)} onRetry={() => void reload()} />
            ) : null}

            {adSpendNotice ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {adSpendNotice}
              </p>
            ) : null}

            {missingSalesPriceCount > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {t("dashboardWonMissingSalesPrice", { count: String(missingSalesPriceCount) })}
              </p>
            ) : null}

            {data.status === "empty" ? (
              <>
                <KpiGrid
                  data={data}
                  comparisonEnabled={view.comparisonEnabled}
                  hiddenMetrics={hiddenMetrics}
                />
                <DashboardEmptyState />
              </>
            ) : (
              <>
                <KpiGrid
                  data={data}
                  comparisonEnabled={view.comparisonEnabled}
                  hiddenMetrics={hiddenMetrics}
                />
                <DevelopmentChart
                  data={data}
                  metricId={chartMetricId}
                  periodLabel={formatDateRangeLabel(measuredRange.start, measuredRange.end, locale)}
                  hiddenMetrics={hiddenMetrics}
                  currentLabel={chartCurrentLabel}
                  comparisonLabel={chartComparisonLabel}
                  compareActive={view.comparisonEnabled}
                  onMetricChange={onMetricChange}
                />
                <LeadPipelineBar
                  stats={pipelineStats}
                  description={t("dashboardPipelinePeriod")}
                />
                <MonthlyTable
                  leads={leads}
                  adSpendByMonth={adSpendByMonth}
                  service={view.service}
                  funnel={view.funnel}
                  segment={view.segment}
                  years={data.chartYears}
                  hiddenMetrics={hiddenMetrics}
                />
              </>
            )}

            <section
              id="performance-secondary"
              aria-label={t("dashboardSecondaryAria")}
              className="hidden"
            />
          </ClientBoardEnter>
        )}
      </ClientCorePageShell>
    </AdminClientRouteGate>
  )
}