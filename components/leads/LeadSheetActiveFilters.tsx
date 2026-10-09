"use client"

import { XIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSegmentId, LeadStatusId } from "@/lib/leads"
import {
  STATUS_FILTER_GROUPS,
  parseGroupUnionFilter,
  type StatusFilterValue,
} from "@/lib/leads/status-filter-groups"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import type { FunnelId } from "@/lib/performance/funnels"
import { DATE_PRESET_MESSAGE_KEYS } from "@/lib/performance/date-preset-i18n"
import { formatDateRangeLabel } from "@/lib/performance/format"
import type { NamedService } from "@/lib/performance/services"
import type { DatePreset, DateRange } from "@/lib/performance/types"

export type SheetFilterChip = { key: string; label: string; onRemove: () => void }

/** Removable filter chips shared by the lead sheet and the customer sheet. */
export function SheetFilterChipRow({
  chips,
  onClear,
}: {
  chips: readonly SheetFilterChip[]
  onClear: () => void
}) {
  const { t } = useLanguage()
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-white px-3 py-2 sm:px-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={t("leadSheetFilterRemove", { label: chip.label })}
          className="inline-flex h-7 max-w-[16rem] items-center gap-1.5 rounded-[4px] border border-primary/25 bg-[#fff1e6] py-0 pr-1 pl-2 text-[12px] leading-none font-medium text-[#b54708] transition-colors hover:border-primary/45 hover:bg-[#ffe4cc]"
        >
          <span className="truncate">{chip.label}</span>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px]">
            <XIcon className="size-2.5" strokeWidth={2.25} aria-hidden />
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-7 items-center rounded-[4px] px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
      >
        {t("leadSheetFilterClear")}
      </button>
    </div>
  )
}

type Chip = SheetFilterChip

/** Shows why the sheet is shorter than the full list, and lets each filter be removed. */
export function LeadSheetActiveFilters({
  dateIsAllTime,
  datePreset,
  dateRange,
  onResetDate,
  statusFilter,
  onStatusFilterChange,
  sheetService,
  onSheetServiceChange,
  sheetSegment,
  onSheetSegmentChange,
  sheetFunnel,
  onSheetFunnelChange,
  enabledServices,
  search,
  onSearchChange,
  onClear,
}: {
  dateIsAllTime: boolean
  datePreset: DatePreset
  dateRange: DateRange
  onResetDate: () => void
  statusFilter: StatusFilterValue
  onStatusFilterChange: (next: StatusFilterValue) => void
  sheetService: string | null
  onSheetServiceChange: (slug: string | null) => void
  sheetSegment: LeadSegmentId | "all"
  onSheetSegmentChange: (segment: LeadSegmentId | "all") => void
  sheetFunnel: FunnelId | "all"
  onSheetFunnelChange: (funnel: FunnelId | "all") => void
  enabledServices: readonly NamedService[]
  search: string
  onSearchChange: (value: string) => void
  onClear: () => void
}) {
  const { locale, t } = useLanguage()
  const chips: Chip[] = []

  if (!dateIsAllTime) {
    chips.push({
      key: "date",
      label:
        datePreset === "custom" || datePreset === "all_time"
          ? formatDateRangeLabel(dateRange.start, dateRange.end, locale)
          : t(DATE_PRESET_MESSAGE_KEYS[datePreset]),
      onRemove: onResetDate,
    })
  }

  if (statusFilter !== "all") {
    const unionGroup = parseGroupUnionFilter(statusFilter)
    const unionMeta = unionGroup ? STATUS_FILTER_GROUPS.find((group) => group.id === unionGroup) : undefined
    chips.push({
      key: "status",
      label: unionMeta ? t(unionMeta.labelKey) : t(leadStatusLabelKey(statusFilter as LeadStatusId)),
      onRemove: () => onStatusFilterChange("all"),
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

  if (sheetFunnel !== "all") {
    chips.push({
      key: "source",
      label: t(FUNNEL_MESSAGE_KEYS[sheetFunnel]),
      onRemove: () => onSheetFunnelChange("all"),
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

  return <SheetFilterChipRow chips={chips} onClear={onClear} />
}
