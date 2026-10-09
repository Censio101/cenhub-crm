"use client"

import { useEffect, useState } from "react"
import { da, enUS } from "date-fns/locale"
import { endOfDay, startOfDay, startOfMonth, subMonths } from "date-fns"
import type { DateRange as DayPickerRange } from "react-day-picker"
import {
  Building2Icon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  GitCompareIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"

import { useCompanyServices } from "@/hooks/useCompanyServices"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DATE_PRESETS } from "@/lib/performance/date-ranges"
import { isDashboardComparisonAvailable } from "@/lib/performance/comparison-availability"
import { comparisonModeMenuLabel } from "@/lib/performance/comparison-labels"
import { DATE_PRESET_MESSAGE_KEYS } from "@/lib/performance/date-preset-i18n"
import { formatDateRangeLabel, formatDayLabel } from "@/lib/performance/format"
import { CUSTOMER_SEGMENTS } from "@/lib/performance/customer-segments"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import { FUNNELS } from "@/lib/performance/funnels"
import type { FunnelId } from "@/lib/performance/funnels"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import { getServiceLabel } from "@/lib/performance/services"
import type { ServiceId } from "@/lib/performance/services"
import type { ComparisonMode, DatePreset, DateRange } from "@/lib/performance/types"

const COMPARISON_MODES: ComparisonMode[] = ["previous_period", "previous_year", "custom"]

function comparisonRangeIsReal(range: DateRange | null): range is DateRange {
  return range != null && range.start.getFullYear() >= 2000
}

const compareRowClass =
  "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-accent"

function CompareTargetSummary({
  preset,
  range,
  comparisonMode,
  comparisonRange,
  earliestLeadDate,
  locale,
  onClear,
}: {
  preset: DatePreset
  range: DateRange
  comparisonMode: ComparisonMode
  comparisonRange: DateRange | null
  earliestLeadDate?: string | null
  locale: "da" | "en"
  onClear: () => void
}) {
  const { t } = useLanguage()
  const real = comparisonRangeIsReal(comparisonRange)
  const earliest = earliestLeadDate ? new Date(`${earliestLeadDate}T00:00:00`) : null
  const beforeData = Boolean(
    real && earliest && comparisonRange!.end.getTime() < earliest.getTime()
  )
  const modeLabel = t(comparisonModeMenuLabel(comparisonMode, range, preset))

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e7c4a8]/70 bg-[#fff8f1] px-3 py-2 text-sm">
      <span className="hidden shrink-0 text-muted-foreground sm:inline">{t("filterCompareComparedTo")}</span>
      <span className="shrink-0 font-medium text-[#9a3412]">{modeLabel}</span>
      <span className="hidden text-muted-foreground sm:inline" aria-hidden>
        ·
      </span>
      <span className="min-w-0 truncate text-muted-foreground">
        {real
          ? formatDateRangeLabel(comparisonRange!.start, comparisonRange!.end, locale)
          : t("filterCompareFromFirstLead")}
        {beforeData ? ` · ${t("filterCompareBeforeData")}` : ""}
      </span>
      <button
        type="button"
        className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground hover:bg-[#fff1e6] hover:text-[#9a3412]"
        aria-label={t("filterCompareDisable")}
        onClick={onClear}
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  )
}

function DashboardCompareMenu({
  preset,
  range,
  comparisonAvailable,
  comparisonEnabled,
  comparisonMode,
  comparisonRange,
  calendarLocale,
  calendarMonth,
  earliestMonth,
  focusMonth,
  draft,
  onDraft,
  onComparisonChange,
  onCustomRange,
}: {
  preset: DatePreset
  range: DateRange
  comparisonAvailable: boolean
  comparisonEnabled: boolean
  comparisonMode: ComparisonMode
  comparisonRange: DateRange | null
  calendarLocale: typeof da
  calendarMonth: Date
  earliestMonth: Date | null
  focusMonth: Date
  draft: DayPickerRange | undefined
  onDraft: (next: DayPickerRange | undefined) => void
  onComparisonChange: (next: {
    enabled: boolean
    mode: ComparisonMode
    customRange?: DateRange | null
  }) => void
  onCustomRange: (range: DateRange) => void
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const real = comparisonRangeIsReal(comparisonRange)
  const showCustomCalendar = comparisonEnabled && comparisonMode === "custom"
  const triggerLabel = !comparisonAvailable
    ? t("filterCompareUnavailableShort")
    : comparisonEnabled
      ? t("filterCompareChange")
      : t("filterCompareOff")
  const triggerTitle = comparisonEnabled ? t("filterCompareChange") : t("filterCompareOff")

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!comparisonAvailable}
        aria-label={t("filterComparePeriod")}
        title={triggerTitle}
        className={cn(
          "group dashboard-chip inline-flex h-9 shrink-0 items-center justify-between gap-2 px-3 sm:min-w-[10.5rem]",
          !comparisonEnabled && "text-muted-foreground",
          !comparisonAvailable && "cursor-not-allowed opacity-80"
        )}
      >
        <GitCompareIcon className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 truncate text-left text-sm">{triggerLabel}</span>
        <ChevronDownIcon
          className="size-4 shrink-0 opacity-70 transition-transform duration-150 ease-out group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,20rem)] rounded-lg p-1.5 shadow-md">
        {comparisonEnabled ? (
          <>
            <button
              type="button"
              className={cn(compareRowClass, "text-muted-foreground")}
              onClick={() => {
                onComparisonChange({ enabled: false, mode: comparisonMode })
                setOpen(false)
              }}
            >
              {t("filterCompareDisable")}
            </button>
            <div className="mx-1 my-1 h-px bg-border" />
          </>
        ) : null}
        <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {t("filterCompareWith")}
        </p>
        {COMPARISON_MODES.map((mode) => {
          const selected = comparisonEnabled && comparisonMode === mode
          const labelKey = comparisonModeMenuLabel(mode, range, preset)
          return (
            <button
              key={mode}
              type="button"
              className={cn(compareRowClass, selected && "bg-[#fff1e6] font-medium text-[#b54708]")}
              onClick={() => {
                onComparisonChange({
                  enabled: true,
                  mode,
                  customRange: mode === "custom" ? comparisonRange : undefined,
                })
                if (mode !== "custom") setOpen(false)
              }}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {selected ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
              </span>
              {t(labelKey)}
            </button>
          )
        })}
        {showCustomCalendar ? (
          <div className="mt-1 border-t border-border pt-2">
            <Calendar
              mode="range"
              locale={calendarLocale}
              numberOfMonths={1}
              defaultMonth={calendarMonth}
              startMonth={earliestMonth ?? undefined}
              endMonth={focusMonth}
              selected={
                real
                  ? draft ?? { from: comparisonRange!.start, to: comparisonRange!.end }
                  : draft
              }
              onSelect={(next) => {
                onDraft(next)
                if (next?.from && next.to) {
                  onCustomRange(normalizePickerRange(next.from, next.to))
                  setOpen(false)
                }
              }}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function monthFromLeadDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return startOfMonth(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}

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
  showScopeFilters = true,
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
  showComparison?: boolean
  /** Service, funnel, and segment chips (hidden on leads — those live on the sheet bar). */
  showScopeFilters?: boolean
  /** yyyy-mm-dd of the oldest and newest lead. Keeps the calendar on real months. */
  earliestLeadDate?: string | null
  latestLeadDate?: string | null
}) {
  const { locale, t } = useLanguage()
  const calendarLocale = locale === "da" ? da : enUS
  const [draft, setDraft] = useState<DayPickerRange | undefined>()
  const [customOpen, setCustomOpen] = useState(false)
  const [comparisonDraft, setComparisonDraft] = useState<DayPickerRange | undefined>()
  const { enabledServiceIds, enabledServices, loaded: servicesLoaded } = useCompanyServices()

  useEffect(() => {
    // Wait for the client's services to load, or a shared link's service filter would be dropped.
    if (servicesLoaded && service && !enabledServiceIds.includes(service)) {
      onServiceChange(null)
    }
  }, [enabledServiceIds, onServiceChange, service, servicesLoaded])

  const isAllTime = preset === "all_time"
  const earliestAnchor = earliestLeadDate ? new Date(`${earliestLeadDate}T00:00:00`) : null
  const comparisonAvailable = isDashboardComparisonAvailable(preset, range, earliestAnchor)
  const periodLabel = isAllTime
    ? t("datePresetAllTimeRange", { date: formatDayLabel(range.end, locale) })
    : formatDateRangeLabel(range.start, range.end, locale)

  const earliestMonth = monthFromLeadDate(earliestLeadDate)
  const latestMonth = monthFromLeadDate(latestLeadDate)
  const todayMonth = startOfMonth(new Date())
  const focusMonth = latestMonth && latestMonth > todayMonth ? latestMonth : todayMonth
  const selectedMonth = startOfMonth(range.start)
  const selectedMonthIsReal = !isAllTime && selectedMonth.getFullYear() > 2015
  let calendarMonth = selectedMonthIsReal ? selectedMonth : subMonths(focusMonth, 1)
  if (earliestMonth && calendarMonth < earliestMonth) calendarMonth = earliestMonth

  const comparisonSelected = comparisonRange ? startOfMonth(comparisonRange.start) : null
  let comparisonCalendarMonth =
    comparisonSelected && comparisonSelected.getFullYear() > 2015
      ? comparisonSelected
      : calendarMonth
  if (earliestMonth && comparisonCalendarMonth < earliestMonth) {
    comparisonCalendarMonth = earliestMonth
  }
  if (comparisonCalendarMonth > focusMonth) comparisonCalendarMonth = focusMonth

  const funnelTriggerLabel = funnel ? t(FUNNEL_MESSAGE_KEYS[funnel]) : t("filterFunnelAll")

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
                <span className="truncate">{periodLabel}</span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dashboard-filter-menu min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("filterPeriod")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onPresetChange("all_time")}>
                    {t("datePresetAllTime")}
                    {isAllTime ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {t("filterSelected")}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  {DATE_PRESETS.filter((item) => item.id !== "custom").map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => onPresetChange(item.id)}>
                      {t(DATE_PRESET_MESSAGE_KEYS[item.id])}
                      {preset === item.id ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {t("filterSelected")}
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (isAllTime) setDraft(undefined)
                    else setDraft({ from: range.start, to: range.end })
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
              defaultMonth={calendarMonth}
              startMonth={earliestMonth ?? undefined}
              endMonth={focusMonth}
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

        {showScopeFilters ? (
          <>
            <Select
              value={service ?? "all"}
              disabled={!servicesLoaded}
              onValueChange={(value) => {
                if (typeof value !== "string" || value === "all") {
                  onServiceChange(null)
                  return
                }
                onServiceChange(value as ServiceId)
              }}
            >
              <SelectTrigger
                className="dashboard-chip min-w-44 px-4"
                aria-label={t("filterServiceAria")}
              >
                <WrenchIcon className="size-4 text-muted-foreground" />
                <SelectValue>
                  {!servicesLoaded
                    ? t("filterServicesLoading")
                    : service
                      ? (enabledServices.find((item) => item.id === service)?.label ??
                        getServiceLabel(service))
                      : t("filterAllServices")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
                <SelectItem value="all">{t("filterAllServices")}</SelectItem>
                {enabledServices.map((item) => (
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
              <SelectTrigger
                className="dashboard-chip min-w-52 px-4"
                aria-label={t("filterFunnelAria")}
              >
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
              <SelectTrigger
                className="dashboard-chip min-w-40 px-4"
                aria-label={t("filterSegmentAria")}
              >
                <Building2Icon className="size-4 text-muted-foreground" />
                <SelectValue>
                  {segment === "b2b"
                    ? t("filterSegmentB2b")
                    : segment === "b2c"
                      ? t("filterSegmentB2c")
                      : t("filterSegmentAll")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
                <SelectItem value="all">{t("filterSegmentAll")}</SelectItem>
                {CUSTOMER_SEGMENTS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.id === "b2b" ? t("filterSegmentB2b") : t("filterSegmentB2c")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
      </div>
      {showComparison ? (
        <div className="flex w-full min-w-0 max-w-full items-center gap-2 sm:max-w-2xl sm:justify-end">
          {comparisonEnabled && comparisonAvailable ? (
            <CompareTargetSummary
              preset={preset}
              range={range}
              comparisonMode={comparisonMode}
              comparisonRange={comparisonRange}
              earliestLeadDate={earliestLeadDate}
              locale={locale}
              onClear={() => onComparisonChange({ enabled: false, mode: comparisonMode })}
            />
          ) : null}
          <DashboardCompareMenu
            preset={preset}
            range={range}
            comparisonAvailable={comparisonAvailable}
            comparisonEnabled={comparisonEnabled}
            comparisonMode={comparisonMode}
            comparisonRange={comparisonRange}
            calendarLocale={calendarLocale}
            calendarMonth={comparisonCalendarMonth}
            earliestMonth={earliestMonth}
            focusMonth={focusMonth}
            draft={comparisonDraft}
            onDraft={setComparisonDraft}
            onComparisonChange={onComparisonChange}
            onCustomRange={(next) => onCustomRange(next, "comparison")}
          />
        </div>
      ) : null}
    </div>
  )
}
