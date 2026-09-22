"use client"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import { CURRENT_COMPANY } from "@/lib/company"
import { formatDateRangeLabel } from "@/lib/performance/format"
import { getCustomerSegmentLabel } from "@/lib/performance/customer-segments"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import { getFunnelLabel } from "@/lib/performance/funnels"
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
}) {
  const { settings } = useAccountSettings()
  const scope = [
    service ? getServiceLabel(service) : null,
    funnel ? getFunnelLabel(funnel) : null,
    segment ? getCustomerSegmentLabel(segment) : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Velkommen, {CURRENT_COMPANY.name}
        </h1>
        {settings.hvidbjergPartner ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
            {/* Local Hvidbjerg mark — dark-on-transparent, readable on the cream page. */}
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
          Viser data for {formatDateRangeLabel(range.start, range.end)}
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
      />
    </header>
  )
}
