"use client"

import { useState } from "react"
import { da, enUS } from "date-fns/locale"
import { endOfDay, startOfDay, startOfMonth, subMonths } from "date-fns"
import type { DateRange as DayPickerRange } from "react-day-picker"
import { CalendarIcon, CalendarRangeIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  SHEET_CONTROL_CLASS,
  SHEET_CONTROL_IDLE,
} from "@/components/leads/LeadSheetFilterMenu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DATE_PRESETS } from "@/lib/performance/date-ranges"
import { DATE_PRESET_MESSAGE_KEYS } from "@/lib/performance/date-preset-i18n"
import { formatDateRangeLabel, formatDayLabel } from "@/lib/performance/format"
import type { DatePreset, DateRange } from "@/lib/performance/types"
import { cn } from "cn"

function monthFromLeadDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return startOfMonth(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}

function normalizePickerRange(from: Date, to: Date): DateRange {
  return { start: startOfDay(from), end: endOfDay(to) }
}

const rowClass =
  "flex min-h-8 w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[13px] outline-none hover:bg-accent"

export function LeadSheetCompactDateFilter({
  preset,
  range,
  isAllTime,
  earliestLeadDate,
  latestLeadDate,
  onPresetChange,
  onCustomRange,
}: {
  preset: DatePreset
  range: DateRange
  /** Quiet default: every lead from the start through today. */
  isAllTime: boolean
  /** yyyy-mm-dd of the oldest and newest lead. Keeps the calendar on real months. */
  earliestLeadDate?: string | null
  latestLeadDate?: string | null
  onPresetChange: (preset: DatePreset) => void
  onCustomRange: (range: DateRange) => void
}) {
  const { locale, t } = useLanguage()
  const calendarLocale = locale === "da" ? da : enUS
  const [open, setOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [draft, setDraft] = useState<DayPickerRange | undefined>()

  const rangeLabel = isAllTime
    ? t("datePresetAllTimeRange", { date: formatDayLabel(range.end, locale) })
    : formatDateRangeLabel(range.start, range.end, locale)

  function close() {
    setOpen(false)
    setShowCalendar(false)
  }

  const earliestMonth = monthFromLeadDate(earliestLeadDate)
  const latestMonth = monthFromLeadDate(latestLeadDate)
  const todayMonth = startOfMonth(new Date())
  const focusMonth = latestMonth && latestMonth > todayMonth ? latestMonth : todayMonth
  const selectedMonth = startOfMonth(range.start)
  const selectedMonthIsReal = !isAllTime && selectedMonth.getFullYear() > 2015
  let calendarMonth = selectedMonthIsReal ? selectedMonth : subMonths(focusMonth, 1)
  if (earliestMonth && calendarMonth < earliestMonth) calendarMonth = earliestMonth

  function openCustomCalendar() {
    if (isAllTime) setDraft(undefined)
    else setDraft({ from: range.start, to: range.end })
    setShowCalendar(true)
  }

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setShowCalendar(false)
      }}
    >
      <PopoverTrigger
        aria-label={t("filterPeriod")}
        title={rangeLabel}
        className={cn(SHEET_CONTROL_CLASS, SHEET_CONTROL_IDLE, "group w-[17rem] justify-between")}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{rangeLabel}</span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-2rem)] rounded-[4px] p-1.5 shadow-md"
      >
        {showCalendar ? (
          <div>
            <button type="button" className={rowClass} onClick={() => setShowCalendar(false)}>
              <ChevronLeftIcon className="size-4 text-muted-foreground" aria-hidden />
              {t("leadSheetFilterBack")}
            </button>
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
                  onCustomRange(normalizePickerRange(next.from, next.to))
                  close()
                }
              }}
            />
          </div>
        ) : (
          <div className="min-w-56">
            <button
              type="button"
              className={cn(rowClass, isAllTime && "bg-[#fff1e6] font-medium text-[#b54708]")}
              onClick={() => {
                onPresetChange("all_time")
                close()
              }}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isAllTime ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
              </span>
              {t("datePresetAllTime")}
            </button>
            {DATE_PRESETS.filter((item) => item.id !== "custom").map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(rowClass, preset === item.id && "bg-[#fff1e6] font-medium text-[#b54708]")}
                onClick={() => {
                  onPresetChange(item.id)
                  close()
                }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {preset === item.id ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
                </span>
                {t(DATE_PRESET_MESSAGE_KEYS[item.id])}
              </button>
            ))}
            <div className="mx-1 my-1 h-px bg-border" />
            <button
              type="button"
              className={cn(rowClass, preset === "custom" && "bg-[#fff1e6] font-medium text-[#b54708]")}
              onClick={openCustomCalendar}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {preset === "custom" ? (
                  <CheckIcon className="size-4 text-primary" aria-hidden />
                ) : (
                  <CalendarRangeIcon className="size-3.5 text-muted-foreground" aria-hidden />
                )}
              </span>
              {t("filterCustomPeriod")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
