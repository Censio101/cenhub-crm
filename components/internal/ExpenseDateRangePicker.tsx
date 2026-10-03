"use client"

import { useState } from "react"
import { da } from "date-fns/locale"
import type { DateRange as DayPickerRange } from "react-day-picker"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateRangeLabel } from "@/lib/performance/format"
import type { DateRange } from "@/lib/performance/types"

export function ExpenseDateRangePicker({
  range,
  onRangeChange,
  className,
  "aria-label": ariaLabel = "Periode",
}: {
  range: DateRange
  onRangeChange: (range: DateRange) => void
  className?: string
  "aria-label"?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DayPickerRange | undefined>()

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft({ from: range.start, to: range.end })
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={`dashboard-chip w-full justify-between gap-2 px-4 sm:w-auto sm:min-w-[15rem] ${className ?? ""}`}
            aria-label={ariaLabel}
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{formatDateRangeLabel(range.start, range.end)}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="range"
          locale={da}
          numberOfMonths={2}
          selected={draft}
          defaultMonth={range.start}
          onSelect={(next) => {
            setDraft(next)
            if (next?.from && next.to) {
              onRangeChange({ start: next.from, end: next.to })
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
