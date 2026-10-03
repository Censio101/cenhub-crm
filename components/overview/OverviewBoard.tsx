"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import {
  DashboardEmptyState,
  DashboardErrorState,
  PartialDataNotice,
} from "@/components/performance/DashboardStates"
import { EconomyInsights } from "@/components/overview/EconomyInsights"
import { LeadFlowCard } from "@/components/overview/LeadFlowCard"
import { MarketingCompare } from "@/components/overview/MarketingCompare"
import { ValueStory } from "@/components/overview/ValueStory"
import { getEmptyPerformanceDashboard, getPerformanceDashboard } from "@/lib/performance/get-performance"
import { formatDateRangeLabel } from "@/lib/performance/format"
import { previousPeriod, previousYear, resolvePreset } from "@/lib/performance/date-ranges"
import {
  dashboardStateToParams,
  parseDashboardParams,
} from "@/lib/performance/url-state"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
} from "@/lib/performance/types"

export function OverviewBoard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState(() => parseDashboardParams(searchParams))
  const queryKey = searchParams.toString()
  const { settings, useDemoData } = useAccountSettings()

  useEffect(() => {
    setView(parseDashboardParams(new URLSearchParams(queryKey)))
  }, [queryKey])

  const data = useMemo(() => {
    try {
      const query = {
        range: view.range,
        comparison: view.comparisonEnabled ? view.comparisonRange : null,
        service: view.service,
        funnel: view.funnel,
        segment: view.segment,
      }
      return useDemoData
        ? getPerformanceDashboard(query)
        : getEmptyPerformanceDashboard(query)
    } catch {
      return null
    }
  }, [useDemoData, view])

  function replaceState(next: typeof view) {
    setView(next)
    const query = dashboardStateToParams(next)
    startTransition(() => {
      router.replace(`/overblik?${query}`, { scroll: false })
    })
  }

  if (data == null) {
    return <DashboardErrorState onRetry={() => router.refresh()} />
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Overblik
          </h1>
          {settings.hvidbjergPartner ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hvidbjerg-vinduet-logo.png"
                alt=""
                className="h-4 w-auto shrink-0"
              />
              <span>Certificeret marketing program</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Hvad Censio og annoncerne har givet {settings.companyName} ·{" "}
            {formatDateRangeLabel(view.range.start, view.range.end)}
          </p>
        </div>
        <DateRangeControls
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
      </header>

      {pending ? <span className="sr-only">Opdaterer overblik</span> : null}
      {data.status === "partial" ? <PartialDataNotice /> : null}

      {data.status === "empty" ? (
        <DashboardEmptyState
          title={
            useDemoData
              ? "Ingen leads i den valgte periode"
              : "Jeres CRM er klar"
          }
          text={
            useDemoData
              ? "Prøv en anden periode, service, funnel eller Privat/Erhverv, eller vent til de første leads kommer ind."
              : "Overblikket fyldes, når de første leads og kunder er i systemet."
          }
        />
      ) : (
        <>
          <ValueStory
            data={data}
            range={view.range}
            service={view.service}
            funnel={view.funnel}
            segment={view.segment}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <LeadFlowCard
              range={view.range}
              service={view.service}
              funnel={view.funnel}
              segment={view.segment}
            />
            <EconomyInsights
              data={data}
              range={view.range}
              service={view.service}
              funnel={view.funnel}
              segment={view.segment}
            />
          </div>
          <MarketingCompare
            range={view.range}
            service={view.service}
            funnel={view.funnel}
            segment={view.segment}
          />
        </>
      )}
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
