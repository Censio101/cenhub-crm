"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

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
import { useDashboardData } from "@/hooks/useDashboardData"
import { computeLeadPipelineStats, filterDashboardLeads } from "@/lib/leads"
import { currentSeriesLabel, comparisonSeriesLabel } from "@/lib/performance/compare"
import { previousPeriod, previousYear, resolvePreset } from "@/lib/performance/date-ranges"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"
import {
  dashboardStateToParams,
  parseDashboardParams,
} from "@/lib/performance/url-state"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
  MetricId,
} from "@/lib/performance/types"

export function PerformanceDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState(() => parseDashboardParams(searchParams))
  const queryKey = searchParams.toString()
  const { leads, adSpendByMonth, error } = useDashboardData()

  useEffect(() => {
    setView(parseDashboardParams(new URLSearchParams(queryKey)))
  }, [queryKey])

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

  function replaceState(next: typeof view) {
    setView(next)
    const query = dashboardStateToParams(next)
    startTransition(() => {
      router.replace(`/?${query}`, { scroll: false })
    })
  }

  const chartCurrentLabel = currentSeriesLabel(view.range)
  const chartComparisonLabel =
    view.comparisonEnabled && view.comparisonRange && data?.comparison
      ? view.comparisonMode === "custom"
        ? "Før"
        : comparisonSeriesLabel(view.comparisonRange)
      : null

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
        onPresetChange={(preset: DatePreset) => {
          const range = resolvePreset(preset)
          replaceState({
            ...view,
            preset,
            range,
            comparisonRange: view.comparisonEnabled
              ? resolveComparison(range, view.comparisonMode, view.comparisonRange)
              : null,
          })
        }}
        onCustomRange={(range, target) => {
          if (target === "current") {
            replaceState({
              ...view,
              preset: "custom",
              range,
              comparisonRange: view.comparisonEnabled
                ? resolveComparison(range, view.comparisonMode, view.comparisonRange)
                : null,
            })
          } else {
            replaceState({
              ...view,
              comparisonEnabled: true,
              comparisonMode: "custom",
              comparisonRange: range,
            })
          }
        }}
        onComparisonChange={({ enabled, mode, customRange }) => {
          replaceState({
            ...view,
            comparisonEnabled: enabled,
            comparisonMode: mode,
            comparisonRange: enabled
              ? resolveComparison(
                  view.range,
                  mode,
                  customRange ?? view.comparisonRange
                )
              : null,
          })
        }}
        service={view.service}
        onServiceChange={(service) => replaceState({ ...view, service })}
        funnel={view.funnel}
        onFunnelChange={(funnel) => replaceState({ ...view, funnel })}
        segment={view.segment}
        onSegmentChange={(segment) => replaceState({ ...view, segment })}
      />

      {pending ? <span className="sr-only">Opdaterer nøgletal</span> : null}

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
            onMetricChange={(metric: MetricId) =>
              replaceState({ ...view, metric })
            }
          />
          <LeadPipelineBar
            stats={pipelineStats}
            description="Pipeline-værdi for den valgte periode"
          />
          <MonthlyTable data={data} />
        </>
      )}

      <section
        id="performance-secondary"
        aria-label="Sekundære indsigter"
        className="hidden"
      />
    </div>
  )
}

function resolveComparison(
  range: DateRange,
  mode: ComparisonMode,
  customRange?: DateRange | null
): DateRange {
  if (mode === "previous_year") return previousYear(range)
  if (mode === "custom" && customRange) return customRange
  return previousPeriod(range)
}
