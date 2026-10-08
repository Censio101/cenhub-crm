"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DashboardHeader } from "@/components/performance/DashboardHeader"
import {
  DashboardEmptyState,
  DashboardErrorState,
  DashboardSkeleton,
  PartialDataNotice,
} from "@/components/performance/DashboardStates"
import { LeadPipelineBar } from "@/components/leads/LeadPipelineBar"
import { DevelopmentChart } from "@/components/performance/DevelopmentChart"
import { KpiGrid } from "@/components/performance/KpiGrid"
import { MonthlyTable } from "@/components/performance/MonthlyTable"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
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
  const { needsClientSelection, organization, loading: sessionLoading, role } =
    useActiveOrganization()
  const { leads, adSpendByMonth, error } = useDashboardData()

  const isClientRole = role === "client_admin" || role === "client_user"
  const showAdminClientPicker =
    needsClientSelection ||
    (!organization &&
      !isClientRole &&
      (sessionLoading || role === null || role === "censio_admin"))

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
      body: JSON.stringify({
        sessionId: "138f58",
        hypothesisId: "A",
        location: "PerformanceDashboard.tsx:gate",
        message: "home dashboard gate",
        data: {
          needsClientSelection,
          showAdminClientPicker,
          sessionLoading,
          role,
          orgSlug: organization?.slug ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }, [
    needsClientSelection,
    organization?.slug,
    role,
    sessionLoading,
    showAdminClientPicker,
  ])
  // #endregion

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
        : comparisonSeriesLabel(view.comparisonRange, t("dashboardChartComparison"))
      : null

  if (showAdminClientPicker) {
    return <SelectClientEmptyState />
  }

  if (sessionLoading) {
    return <DashboardSkeleton />
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
          {t(error)}
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
