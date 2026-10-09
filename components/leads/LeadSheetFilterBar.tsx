"use client"

import { DownloadIcon, Maximize2Icon, Minimize2Icon } from "lucide-react"

import { LeadSheetActiveFilters } from "@/components/leads/LeadSheetActiveFilters"
import { LeadSheetCompactDateFilter } from "@/components/leads/LeadSheetCompactDateFilter"
import {
  SHEET_CONTROL_CLASS,
  SHEET_CONTROL_IDLE,
} from "@/components/leads/LeadSheetFilterMenu"
import { LeadSheetScopeChips } from "@/components/leads/LeadSheetScopeChips"
import { SheetSearchField } from "@/components/leads/SheetSearchField"
import { StatusFilterGroups } from "@/components/leads/StatusFilterGroups"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { LeadSegmentId, LeadStatusId } from "@/lib/leads"
import type { StatusFilterValue } from "@/lib/leads/status-filter-groups"
import type { FunnelId } from "@/lib/performance/funnels"
import type { NamedService } from "@/lib/performance/services"
import type { DatePreset, DateRange } from "@/lib/performance/types"
import { cn } from "cn"

export function LeadSheetFilterBar({
  preset,
  range,
  onPresetChange,
  onCustomRange,
  statusCounts,
  statusFilter,
  onStatusFilterChange,
  sheetService,
  onSheetServiceChange,
  sheetSegment,
  onSheetSegmentChange,
  sheetFunnel,
  onSheetFunnelChange,
  enabledServices,
  servicesLoaded,
  search,
  onSearchChange,
  dateIsAllTime,
  earliestLeadDate,
  latestLeadDate,
  onResetDate,
  onExport,
  focusOpen,
  onToggleFocus,
}: {
  preset: DatePreset
  range: DateRange
  onPresetChange: (preset: DatePreset) => void
  onCustomRange: (range: DateRange) => void
  statusCounts: Partial<Record<LeadStatusId, number>>
  statusFilter: StatusFilterValue
  onStatusFilterChange: (next: StatusFilterValue) => void
  sheetService: string | null
  onSheetServiceChange: (slug: string | null) => void
  sheetSegment: LeadSegmentId | "all"
  onSheetSegmentChange: (segment: LeadSegmentId | "all") => void
  sheetFunnel: FunnelId | "all"
  onSheetFunnelChange: (funnel: FunnelId | "all") => void
  enabledServices: readonly NamedService[]
  servicesLoaded: boolean
  search: string
  onSearchChange: (value: string) => void
  dateIsAllTime: boolean
  earliestLeadDate?: string | null
  latestLeadDate?: string | null
  onResetDate: () => void
  onExport?: () => void
  focusOpen?: boolean
  onToggleFocus?: () => void
}) {
  const { t } = useLanguage()

  function clearFilters() {
    onStatusFilterChange("all")
    onSheetServiceChange(null)
    onSheetSegmentChange("all")
    onSheetFunnelChange("all")
    onSearchChange("")
    onResetDate()
  }

  return (
    <div className="shrink-0 border-b border-border bg-[#faf9f7]">
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
      <LeadSheetCompactDateFilter
        preset={preset}
        range={range}
        isAllTime={dateIsAllTime}
        earliestLeadDate={earliestLeadDate}
        latestLeadDate={latestLeadDate}
        onPresetChange={onPresetChange}
        onCustomRange={onCustomRange}
      />
      <StatusFilterGroups
        counts={statusCounts}
        value={statusFilter}
        onChange={onStatusFilterChange}
      />
      <LeadSheetScopeChips
        sheetSegment={sheetSegment}
        onSheetSegmentChange={onSheetSegmentChange}
        sheetService={sheetService}
        onSheetServiceChange={onSheetServiceChange}
        sheetFunnel={sheetFunnel}
        onSheetFunnelChange={onSheetFunnelChange}
        enabledServices={enabledServices}
        servicesLoaded={servicesLoaded}
      />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SheetSearchField
          value={search}
          onChange={onSearchChange}
          placeholder={t("leadSheetSearchPlaceholder")}
          ariaLabel={t("leadSheetSearchAria")}
          className="w-full min-w-[11rem] sm:w-56 [&_input]:h-9 [&_input]:rounded-[4px] [&_input]:border-[#d9cfc3] [&_input]:text-[13px]"
        />
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className={cn(SHEET_CONTROL_CLASS, SHEET_CONTROL_IDLE)}
          >
            <DownloadIcon className="size-4 text-muted-foreground" aria-hidden />
            {t("leadSheetExport")}
          </button>
        ) : null}
        {onToggleFocus ? (
          <button
            type="button"
            title={focusOpen ? t("leadSheetFocusExit") : t("leadSheetFocusEnter")}
            onClick={onToggleFocus}
            className={cn(SHEET_CONTROL_CLASS, SHEET_CONTROL_IDLE, "hidden md:inline-flex")}
          >
            {focusOpen ? (
              <Minimize2Icon className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <Maximize2Icon className="size-4 text-muted-foreground" aria-hidden />
            )}
            {focusOpen ? t("leadSheetFocusExit") : t("leadSheetFocusEnterShort")}
          </button>
        ) : null}
      </div>
    </div>
    <LeadSheetActiveFilters
      dateIsAllTime={dateIsAllTime}
      datePreset={preset}
      dateRange={range}
      onResetDate={onResetDate}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      sheetService={sheetService}
      onSheetServiceChange={onSheetServiceChange}
      sheetSegment={sheetSegment}
      onSheetSegmentChange={onSheetSegmentChange}
      sheetFunnel={sheetFunnel}
      onSheetFunnelChange={onSheetFunnelChange}
      enabledServices={enabledServices}
      search={search}
      onSearchChange={onSearchChange}
      onClear={clearFilters}
    />
    </div>
  )
}
