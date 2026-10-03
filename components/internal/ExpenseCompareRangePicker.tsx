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

export function ExpenseCompareRangePicker({
  comparisonRange,
  onComparisonRangeChange,
  className,
}: {
  comparisonRange: DateRange | null
  onComparisonRangeChange: (range: DateRange | null) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DayPickerRange | undefined>()

  const buttonLabel =
    comparisonRange == null
      ? "Ingen"
      : formatDateRangeLabel(comparisonRange.start, comparisonRange.end)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && comparisonRange) {
          setDraft({ from: comparisonRange.start, to: comparisonRange.end })
        } else if (next) {
          setDraft(undefined)
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={`dashboard-chip w-full justify-between gap-2 px-4 sm:w-auto sm:min-w-[15rem] ${className ?? ""}`}
            aria-label="Sammenlign"
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{buttonLabel}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col gap-2 p-2" align="start">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start px-2 text-muted-foreground"
          onClick={() => {
            onComparisonRangeChange(null)
            setOpen(false)
          }}
        >
          Ingen sammenligning
        </Button>
        <Calendar
          mode="range"
          locale={da}
          numberOfMonths={2}
          selected={draft}
          defaultMonth={comparisonRange?.start}
          onSelect={(next) => {
            setDraft(next)
            if (next?.from && next.to) {
              onComparisonRangeChange({ start: next.from, end: next.to })
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
