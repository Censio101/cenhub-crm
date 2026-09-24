"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import {
  DashboardEmptyState,
  DashboardErrorState,
  PartialDataNotice,
} from "@/components/performance/DashboardStates"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useDashboardData } from "@/hooks/useDashboardData"
import { EconomyInsights } from "@/components/overview/EconomyInsights"
import { LeadFlowCard } from "@/components/overview/LeadFlowCard"
import { MarketingCompare } from "@/components/overview/MarketingCompare"
import { ValueStory } from "@/components/overview/ValueStory"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { CURRENT_COMPANY } from "@/lib/company"
import { formatDateRangeLabel } from "@/lib/performance/format"
import { getPerformanceDashboard } from "@/lib/performance/get-performance"

export function OverviewBoard() {
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
  } = useDashboardViewState("/overblik")
  const { settings } = useAccountSettings()
  const { organization, role } = useActiveOrganization()
  const { leads, adSpendByMonth, needsClientSelection } = useDashboardData()
  const clientName =
    organization?.name ??
    (role === "censio_admin" ? "klienten" : CURRENT_COMPANY.name)

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

  if (needsClientSelection) {
    return <SelectClientEmptyState />
  }

  if (data == null) {
    return <DashboardErrorState onRetry={() => router.refresh()} />
  }

  const dateRangeLabel = formatDateRangeLabel(view.range.start, view.range.end)

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {t("overviewBoardTitle")}
          </h1>
          {settings.hvidbjergPartner ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hvidbjerg-vinduet-logo.png"
                alt=""
                className="h-4 w-auto shrink-0"
              />
              <span>{t("overviewCertifiedProgram")}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("overviewBoardSubtitle", {
              clientName: formatClientDisplayName(clientName),
              dateRange: dateRangeLabel,
            })}
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
        />
      </header>

      {pending ? (
        <span className="sr-only">{t("dashboardUpdating")}</span>
      ) : null}
      {data.status === "partial" ? <PartialDataNotice /> : null}

      {data.status === "empty" ? (
        <DashboardEmptyState />
      ) : (
        <>
          <ValueStory
            data={data}
            leads={leads}
            adSpendByMonth={adSpendByMonth}
            range={view.range}
            service={view.service}
            funnel={view.funnel}
            segment={view.segment}
          />
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
  )
}
