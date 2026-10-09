"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/performance/DashboardStates"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useDashboardData } from "@/hooks/useDashboardData"
import { EconomyInsights } from "@/components/overview/EconomyInsights"
import { LeadFlowCard } from "@/components/overview/LeadFlowCard"
import { MarketingCompare } from "@/components/overview/MarketingCompare"
import { ValueStory } from "@/components/overview/ValueStory"
import { HvidbjergPartnerBadge } from "@/components/organization/HvidbjergPartnerBadge"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { parseIsoDate } from "@/lib/performance/date-ranges"
import { formatDateRangeLabel, formatDayLabel } from "@/lib/performance/format"
import { getLeadDataDateRange } from "@/lib/performance/from-leads"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"

export function OverviewBoard() {
  const router = useRouter()
  const { locale, t } = useLanguage()
  const { organization, role } = useActiveOrganization()
  const { leads, adSpendByMonth } = useDashboardData()
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
  } = useDashboardViewState("/overblik", comparisonAnchor)
  const measuredRange = useMemo(
    () =>
      view.preset === "all_time" && comparisonAnchor
        ? { start: comparisonAnchor, end: view.range.end }
        : view.range,
    [comparisonAnchor, view.preset, view.range]
  )
  const clientName = organization?.name ?? (role === "censio_admin" ? "klienten" : null)

  const data = useMemo(() => {
    try {
      return getPerformanceDashboard(
        {
          range: measuredRange,
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
  }, [view, leads, adSpendByMonth, measuredRange])

  const dateRangeLabel =
    view.preset === "all_time"
      ? t("datePresetAllTimeRange", { date: formatDayLabel(view.range.end, locale) })
      : formatDateRangeLabel(view.range.start, view.range.end, locale)

  return (
    <AdminClientRouteGate>
      {data == null ? (
        <DashboardErrorState onRetry={() => router.refresh()} />
      ) : (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {t("overviewBoardTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {clientName ? (
              t("overviewBoardSubtitle", {
                clientName: formatClientDisplayName(clientName),
                dateRange: dateRangeLabel,
              })
            ) : (
              <span
                className="inline-block h-4 w-72 animate-pulse rounded bg-muted"
                aria-hidden="true"
              />
            )}
          </p>
        </div>
        <DateRangeControls
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
      </header>

      {pending ? (
        <span className="sr-only">{t("dashboardUpdating")}</span>
      ) : null}
      {data.status === "empty" ? (
        <DashboardEmptyState />
      ) : (
        <>
          <ValueStory data={data} comparisonEnabled={view.comparisonEnabled} />
          <div className="grid gap-4 xl:grid-cols-2">
            <LeadFlowCard
              leads={leads}
              range={view.range}
              service={view.service}
              funnel={view.funnel}
              segment={view.segment}
            />
            <EconomyInsights
              data={data}
              leads={leads}
              range={view.range}
              service={view.service}
              funnel={view.funnel}
              segment={view.segment}
            />
          </div>
          <MarketingCompare
            leads={leads}
            adSpendByMonth={adSpendByMonth}
            range={view.range}
            service={view.service}
            funnel={view.funnel}
            segment={view.segment}
          />
        </>
      )}
    </div>
      )}
    </AdminClientRouteGate>
  )
}
