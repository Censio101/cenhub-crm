"use client"

import { Building2Icon, DownloadIcon, Maximize2Icon, MegaphoneIcon, WrenchIcon } from "lucide-react"

import { LeadSheetCompactDateFilter } from "@/components/leads/LeadSheetCompactDateFilter"
import {
  SheetFilterChipRow,
  type SheetFilterChip,
} from "@/components/leads/LeadSheetActiveFilters"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuItem,
  SHEET_CONTROL_CLASS,
  SHEET_CONTROL_IDLE,
} from "@/components/leads/LeadSheetFilterMenu"
import { SheetSearchField } from "@/components/leads/SheetSearchField"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import type { CustomerSourceId } from "@/lib/customers"
import type { LeadSegmentId } from "@/lib/leads"
import { DATE_PRESET_MESSAGE_KEYS } from "@/lib/performance/date-preset-i18n"
import { formatDateRangeLabel } from "@/lib/performance/format"
import type { NamedService } from "@/lib/performance/services"
import type { DatePreset, DateRange } from "@/lib/performance/types"
import { cn } from "cn"

export function CustomersSheetFilterBar({
  preset,
  range,
  dateIsAllTime,
  earliestLeadDate,
  latestLeadDate,
  onPresetChange,
  onCustomRange,
  onResetDate,
  sheetSegment,
  onSheetSegmentChange,
  sheetService,
  onSheetServiceChange,
  sourceFilter,
  onSourceFilterChange,
  sourceLabelKeys,
  enabledServices,
  servicesLoaded,
  search,
  onSearchChange,
  onExport,
  onToggleFocus,
}: {
  preset: DatePreset
  range: DateRange
  dateIsAllTime: boolean
  earliestLeadDate?: string | null
  latestLeadDate?: string | null
  onPresetChange: (preset: DatePreset) => void
  onCustomRange: (range: DateRange) => void
  onResetDate: () => void
  sheetSegment: LeadSegmentId | "all"
  onSheetSegmentChange: (segment: LeadSegmentId | "all") => void
  sheetService: string | null
  onSheetServiceChange: (slug: string | null) => void
  sourceFilter: CustomerSourceId | "all"
  onSourceFilterChange: (source: CustomerSourceId | "all") => void
  sourceLabelKeys: Record<CustomerSourceId, MessageKey>
  enabledServices: readonly NamedService[]
  servicesLoaded: boolean
  search: string
  onSearchChange: (value: string) => void
  onExport?: () => void
  onToggleFocus?: () => void
}) {
  const { locale, t } = useLanguage()

  function clearFilters() {
    onSheetSegmentChange("all")
    onSheetServiceChange(null)
    onSourceFilterChange("all")
    onSearchChange("")
    onResetDate()
  }

  const chips: SheetFilterChip[] = []
  if (!dateIsAllTime) {
    chips.push({
      key: "date",
      label:
        preset === "custom" || preset === "all_time"
          ? formatDateRangeLabel(range.start, range.end, locale)
          : t(DATE_PRESET_MESSAGE_KEYS[preset]),
      onRemove: onResetDate,
    })
  }
  if (sheetSegment !== "all") {
    chips.push({
      key: "segment",
      label: sheetSegment === "b2b" ? t("filterSegmentB2b") : t("filterSegmentB2c"),
      onRemove: () => onSheetSegmentChange("all"),
    })
  }
  if (sheetService) {
    chips.push({
      key: "service",
      label: enabledServices.find((service) => service.id === sheetService)?.label ?? sheetService,
      onRemove: () => onSheetServiceChange(null),
    })
  }
  if (sourceFilter !== "all") {
    chips.push({
      key: "source",
      label: t(sourceLabelKeys[sourceFilter]),
      onRemove: () => onSourceFilterChange("all"),
    })
  }
  const query = search.trim()
  if (query) {
    chips.push({
      key: "search",
      label: query,
      onRemove: () => onSearchChange(""),
    })
  }

  const serviceValue = sheetService
    ? (enabledServices.find((service) => service.id === sheetService)?.label ?? sheetService)
    : ""

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
        <LeadSheetFilterMenu
          icon={<Building2Icon />}
          label={t("leadSheetFilterLabelSegment")}
          ariaLabel={t("filterSegmentAria")}
          active={sheetSegment !== "all"}
          valueLabel={
            sheetSegment === "b2b" ? t("filterSegmentB2b") : sheetSegment === "b2c" ? t("filterSegmentB2c") : ""
          }
        >
          <LeadSheetFilterMenuItem selected={sheetSegment === "all"} onSelect={() => onSheetSegmentChange("all")}>
            {t("filterSegmentAll")}
          </LeadSheetFilterMenuItem>
          <LeadSheetFilterMenuItem selected={sheetSegment === "b2c"} onSelect={() => onSheetSegmentChange("b2c")}>
            {t("filterSegmentB2c")}
          </LeadSheetFilterMenuItem>
          <LeadSheetFilterMenuItem selected={sheetSegment === "b2b"} onSelect={() => onSheetSegmentChange("b2b")}>
            {t("filterSegmentB2b")}
          </LeadSheetFilterMenuItem>
        </LeadSheetFilterMenu>
        <LeadSheetFilterMenu
          icon={<WrenchIcon />}
          label={t("leadSheetFilterLabelService")}
          ariaLabel={t("filterServiceAria")}
          active={Boolean(sheetService)}
          valueLabel={serviceValue}
          disabled={!servicesLoaded}
        >
          <LeadSheetFilterMenuItem selected={!sheetService} onSelect={() => onSheetServiceChange(null)}>
            {t("filterAllServices")}
          </LeadSheetFilterMenuItem>
          {enabledServices.map((item) => (
            <LeadSheetFilterMenuItem
              key={item.id}
              selected={sheetService === item.id}
              onSelect={() => onSheetServiceChange(item.id)}
            >
              {item.label}
            </LeadSheetFilterMenuItem>
          ))}
        </LeadSheetFilterMenu>
        <LeadSheetFilterMenu
          icon={<MegaphoneIcon />}
          label={t("leadSheetFilterLabelSource")}
          ariaLabel={t("customersFilterSourceAria")}
          active={sourceFilter !== "all"}
          valueLabel={sourceFilter === "all" ? "" : t(sourceLabelKeys[sourceFilter])}
        >
          <LeadSheetFilterMenuItem selected={sourceFilter === "all"} onSelect={() => onSourceFilterChange("all")}>
            {t("customersAllSources")}
          </LeadSheetFilterMenuItem>
          {(Object.keys(sourceLabelKeys) as CustomerSourceId[]).map((id) => (
            <LeadSheetFilterMenuItem
              key={id}
              selected={sourceFilter === id}
              onSelect={() => onSourceFilterChange(id)}
            >
              {t(sourceLabelKeys[id])}
            </LeadSheetFilterMenuItem>
          ))}
        </LeadSheetFilterMenu>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SheetSearchField
            value={search}
            onChange={onSearchChange}
            placeholder={t("customersSearchPlaceholder")}
            ariaLabel={t("customersSearchAria")}
            className="w-full min-w-[11rem] sm:w-56 [&_input]:h-9 [&_input]:rounded-[4px] [&_input]:border-[#d9cfc3] [&_input]:text-[13px]"
          />
          {onExport ? (
            <button type="button" onClick={onExport} className={cn(SHEET_CONTROL_CLASS, SHEET_CONTROL_IDLE)}>
              <DownloadIcon className="size-4 text-muted-foreground" aria-hidden />
              {t("leadSheetExport")}
            </button>
          ) : null}
          {onToggleFocus ? (
            <button
              type="button"
              title={t("leadSheetFocusEnter")}
              onClick={onToggleFocus}
              className={cn(SHEET_CONTROL_CLASS, SHEET_CONTROL_IDLE, "hidden md:inline-flex")}
            >
              <Maximize2Icon className="size-4 text-muted-foreground" aria-hidden />
              {t("leadSheetFocusEnterShort")}
            </button>
          ) : null}
        </div>
      </div>
      <SheetFilterChipRow chips={chips} onClear={clearFilters} />
    </div>
  )
}
