"use client"

import { useState } from "react"
import { da, enUS } from "date-fns/locale"
import { endOfDay, startOfDay } from "date-fns"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { formatDayLabel } from "@/lib/performance/format"
import type { DateRange } from "@/lib/performance/types"
import { cn } from "cn"

type Props = {
  /** Range to start from (the current custom range), or null for an empty picker. */
  initial?: DateRange | null
  defaultMonth: Date
  startMonth?: Date
  endMonth?: Date
  numberOfMonths?: 1 | 2
  onApply: (range: DateRange) => void
  onCancel: () => void
}

function DateBox({
  label,
  value,
  active,
  placeholder,
}: {
  label: string
  value: string | null
  active: boolean
  placeholder: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border px-3 py-1.5 transition-colors",
        active ? "border-primary/50 bg-[#fff8f1]" : "border-[#e4ddd4] bg-white"
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("truncate text-sm", value ? "font-medium text-foreground" : "text-muted-foreground")}>
        {value ?? placeholder}
      </p>
    </div>
  )
}

/**
 * Two-step custom range picker: choose a start day, then an end day, then Apply.
 * The panel stays open until Apply, so a half-finished selection never disappears.
 */
export function DateRangePickerPanel({
  initial,
  defaultMonth,
  startMonth,
  endMonth,
  numberOfMonths = 2,
  onApply,
  onCancel,
}: Props) {
  const { locale, t } = useLanguage()
  const [from, setFrom] = useState<Date | null>(initial ? startOfDay(initial.start) : null)
  const [to, setTo] = useState<Date | null>(initial ? startOfDay(initial.end) : null)

  const pickingEnd = from != null && to == null

  function pickDay(day: Date) {
    const picked = startOfDay(day)
    if (!from || to) {
      // First click, or starting over after a finished range: this day is the new start.
      setFrom(picked)
      setTo(null)
      return
    }
    if (picked < from) {
      setTo(from)
      setFrom(picked)
    } else {
      setTo(picked)
    }
  }

  const hint = !from
    ? t("filterRangeHintStart")
    : !to
      ? t("filterRangeHintEnd")
      : t("filterRangeHintReady")

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 px-1 pt-1">
        <DateBox
          label={t("filterRangeStart")}
          value={from ? formatDayLabel(from, locale) : null}
          active={!from}
          placeholder={t("filterRangeSelectDate")}
        />
        <DateBox
          label={t("filterRangeEnd")}
          value={to ? formatDayLabel(to, locale) : null}
          active={pickingEnd}
          placeholder={t("filterRangeSelectDate")}
        />
      </div>
      <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
        {hint}
      </p>
      <Calendar
        mode="range"
        locale={locale === "da" ? da : enUS}
        numberOfMonths={numberOfMonths}
        defaultMonth={defaultMonth}
        startMonth={startMonth}
        endMonth={endMonth}
        selected={from ? { from, to: to ?? undefined } : undefined}
        onDayClick={pickDay}
      />
      <div className="flex justify-end gap-2 border-t border-border px-1 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("filterRangeCancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!from || !to}
          onClick={() => {
            if (from && to) onApply({ start: startOfDay(from), end: endOfDay(to) })
          }}
        >
          {t("filterRangeApply")}
        </Button>
      </div>
    </div>
  )
}
