"use client"

import { HvidbjergPartnerBadge } from "@/components/organization/HvidbjergPartnerBadge"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { formatDateRangeLabel, formatDayLabel } from "@/lib/performance/format"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import type { FunnelId } from "@/lib/performance/funnels"
import { getServiceLabel } from "@/lib/performance/services"
import type { ServiceId } from "@/lib/performance/services"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
} from "@/lib/performance/types"

export function DashboardHeader({
  preset,
  range,
  comparisonEnabled,
  comparisonMode,
  comparisonRange,
  onPresetChange,
  onCustomRange,
  onComparisonChange,
  service,
  onServiceChange,
  funnel,
  onFunnelChange,
  segment,
  onSegmentChange,
  earliestLeadDate,
  latestLeadDate,
}: {
  preset: DatePreset
  range: DateRange
  comparisonEnabled: boolean
  comparisonMode: ComparisonMode
  comparisonRange: DateRange | null
  onPresetChange: (preset: DatePreset) => void
  onCustomRange: (range: DateRange, target: "current" | "comparison") => void
  onComparisonChange: (next: {
    enabled: boolean
    mode: ComparisonMode
    customRange?: DateRange | null
  }) => void
  service: ServiceId | null
  onServiceChange: (service: ServiceId | null) => void
  funnel: FunnelId | null
  onFunnelChange: (funnel: FunnelId | null) => void
  segment: CustomerSegmentId | null
  onSegmentChange: (segment: CustomerSegmentId | null) => void
  earliestLeadDate?: string | null
  latestLeadDate?: string | null
}) {
  const { organization } = useActiveOrganization()
  const { locale, t } = useLanguage()
  const scope = [
    service ? getServiceLabel(service) : null,
    funnel ? t(FUNNEL_MESSAGE_KEYS[funnel]) : null,
    segment
      ? segment === "b2b"
        ? t("filterSegmentB2b")
        : t("filterSegmentB2c")
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {organization ? (
            t("dashboardWelcome", { name: formatClientDisplayName(organization.name) })
          ) : (
            <span
              className="inline-block h-9 w-64 animate-pulse rounded-md bg-muted"
              aria-hidden="true"
            />
          )}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("dashboardShowingData", {
            dateRange:
              preset === "all_time"
                ? t("datePresetAllTimeRange", { date: formatDayLabel(range.end, locale) })
                : formatDateRangeLabel(range.start, range.end, locale),
          })}
          {scope ? ` · ${scope}` : ""}
        </p>
      </div>
      <DateRangeControls
        preset={preset}
        range={range}
        comparisonEnabled={comparisonEnabled}
        comparisonMode={comparisonMode}
        comparisonRange={comparisonRange}
        onPresetChange={onPresetChange}
        onCustomRange={onCustomRange}
        onComparisonChange={onComparisonChange}
        service={service}
        onServiceChange={onServiceChange}
        funnel={funnel}
        onFunnelChange={onFunnelChange}
        segment={segment}
        onSegmentChange={onSegmentChange}
        earliestLeadDate={earliestLeadDate}
        latestLeadDate={latestLeadDate}
      />
    </header>
  )
}
