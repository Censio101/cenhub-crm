"use client"

import { useEffect, useMemo, useState } from "react"
import { da, enUS } from "date-fns/locale"
import { endOfDay, startOfDay } from "date-fns"
import type { DateRange as DayPickerRange } from "react-day-picker"
import { Building2Icon, CalendarIcon, ChevronDownIcon, FunnelIcon, WrenchIcon } from "lucide-react"
import { cn } from "cn"

import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DATE_PRESETS } from "@/lib/performance/date-ranges"
import {
  COMPARISON_MODE_MESSAGE_KEYS,
  DATE_PRESET_MESSAGE_KEYS,
} from "@/lib/performance/date-preset-i18n"
import { formatDateRangeLabel } from "@/lib/performance/format"
import {
  CUSTOMER_SEGMENTS,
  getCustomerSegmentLabel,
} from "@/lib/performance/customer-segments"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import { FUNNELS } from "@/lib/performance/funnels"
import type { FunnelId } from "@/lib/performance/funnels"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import { getServiceLabel, isServiceId } from "@/lib/performance/services"
import type { ServiceId } from "@/lib/performance/services"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
} from "@/lib/performance/types"

const COMPARISON_MODES: ComparisonMode[] = [
  "previous_period",
  "previous_year",
  "custom",
]

function normalizePickerRange(from: Date, to: Date): DateRange {
  return { start: startOfDay(from), end: endOfDay(to) }
}

export function DateRangeControls({
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
  showComparison = true,
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
  showComparison?: boolean
}) {
  const { locale, t } = useLanguage()
  const calendarLocale = locale === "da" ? da : enUS
  const [draft, setDraft] = useState<DayPickerRange | undefined>()
  const [customOpen, setCustomOpen] = useState(false)
  const [comparisonDraft, setComparisonDraft] = useState<
    DayPickerRange | undefined
  >()
  const { enabledServiceIds, enabledServices } = useCompanyServices()

  useEffect(() => {
    if (service && !enabledServiceIds.includes(service)) {
      onServiceChange(null)
    }
  }, [enabledServiceIds, onServiceChange, service])

  const selectedPresetLabel = t(
    DATE_PRESET_MESSAGE_KEYS[preset] ?? "datePresetFallback"
  )

  const funnelTriggerLabel = funnel
    ? t(FUNNEL_MESSAGE_KEYS[funnel])
    : t("filterFunnelAll")

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="dashboard-chip justify-between gap-2.5 px-4 sm:min-w-64"
                  />
                }
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="truncate">
                  {formatDateRangeLabel(range.start, range.end)}
                </span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dashboard-filter-menu min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("filterPeriod")}</DropdownMenuLabel>
                  {DATE_PRESETS.filter((item) => item.id !== "custom").map(
                    (item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => onPresetChange(item.id)}
                      >
                        {t(DATE_PRESET_MESSAGE_KEYS[item.id])}
                        {preset === item.id ? (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {t("filterSelected")}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setDraft({ from: range.start, to: range.end })
                    setCustomOpen(true)
                  }}
                >
                  {t("filterCustomPeriod")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PopoverTrigger className="sr-only" aria-hidden>
              {t("filterPeriod")}
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-auto p-2" align="end">
            <Calendar
              mode="range"
              locale={calendarLocale}
              numberOfMonths={2}
              selected={draft}
              defaultMonth={range.start}
              onSelect={(next) => {
                setDraft(next)
                if (next?.from && next.to) {
                  onCustomRange(normalizePickerRange(next.from, next.to), "current")
                  setCustomOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={service ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onServiceChange(null)
              return
            }
            onServiceChange(value as ServiceId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-44 px-4" aria-label={t("filterServiceAria")}>
            <WrenchIcon className="size-4 text-muted-foreground" />
            <SelectValue>{getServiceLabel(service)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">{t("filterAllServices")}</SelectItem>
            {enabledServices
              .filter((item) => isServiceId(item.id))
              .map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={funnel ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onFunnelChange(null)
              return
            }
            onFunnelChange(value as FunnelId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-52 px-4" aria-label={t("filterFunnelAria")}>
            <FunnelIcon className="size-4 text-muted-foreground" />
            <SelectValue>{funnelTriggerLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">{t("filterFunnelAll")}</SelectItem>
            {FUNNELS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {t(FUNNEL_MESSAGE_KEYS[item.id])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={segment ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onSegmentChange(null)
              return
            }
            onSegmentChange(value as CustomerSegmentId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-40 px-4" aria-label={t("filterSegmentAria")}>
            <Building2Icon className="size-4 text-muted-foreground" />
            <SelectValue>{getCustomerSegmentLabel(segment)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">{t("filterSegmentAll")}</SelectItem>
            {CUSTOMER_SEGMENTS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showComparison ? (
          <Button
            variant={comparisonEnabled ? "default" : "outline"}
            className={
              comparisonEnabled
                ? "h-11 rounded-[5px] px-4"
                : "dashboard-chip px-4"
            }
            aria-pressed={comparisonEnabled}
            onClick={() =>
              onComparisonChange({
                enabled: !comparisonEnabled,
                mode: comparisonMode,
              })
            }
          >
            {t("filterComparePeriod")}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        {selectedPresetLabel}
        <span className="hidden sm:inline"> · {t("filterFunnelHint")}</span>
      </p>

      {showComparison && comparisonEnabled ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="dashboard-chip px-4" />}
            >
              {t(COMPARISON_MODE_MESSAGE_KEYS[comparisonMode])}
              <ChevronDownIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dashboard-filter-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("filterCompareWith")}</DropdownMenuLabel>
                {COMPARISON_MODES.map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() =>
                      onComparisonChange({
                        enabled: true,
                        mode,
                        customRange: mode === "custom" ? comparisonRange : undefined,
                      })
                    }
                  >
                    {t(COMPARISON_MODE_MESSAGE_KEYS[mode])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {comparisonRange ? (
            comparisonMode === "custom" ? (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="sm" className="text-muted-foreground" />
                  }
                >
                  {t("filterVersus")}{" "}
                  {formatDateRangeLabel(comparisonRange.start, comparisonRange.end)}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <Calendar
                    mode="range"
                    locale={calendarLocale}
                    numberOfMonths={1}
                    selected={
                      comparisonDraft ?? {
                        from: comparisonRange.start,
                        to: comparisonRange.end,
                      }
                    }
                    onSelect={(next) => {
                      setComparisonDraft(next)
                      if (next?.from && next.to) {
                        onCustomRange(
                          normalizePickerRange(next.from, next.to),
                          "comparison"
                        )
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <p className={cn("self-center text-xs text-muted-foreground")}>
                {t("filterVersus")}{" "}
                {formatDateRangeLabel(comparisonRange.start, comparisonRange.end)}
              </p>
            )
          ) : (
            <p className="self-center text-xs text-muted-foreground">
              {t("filterNoComparisonData")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
