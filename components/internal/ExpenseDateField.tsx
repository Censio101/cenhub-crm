"use client"

import { useState } from "react"
import { da } from "date-fns/locale"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { onboardingFieldClass } from "@/components/onboarding/field"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { parseIsoDate, toIsoDate } from "@/lib/performance/date-ranges"

export function ExpenseDateField({
  label,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  label: string
  value: string
  onChange: (iso: string) => void
  "aria-label"?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseIsoDate(value) ?? new Date()

  return (
    <div className="grid gap-1 text-sm text-[var(--text-secondary)]">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={`${onboardingFieldClass} justify-between gap-2 font-normal`}
              aria-label={ariaLabel ?? label}
            />
          }
        >
          <span>{format(selected, "d. MMM yyyy", { locale: da })}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            locale={da}
            selected={selected}
            defaultMonth={selected}
            onSelect={(next) => {
              if (!next) return
              onChange(toIsoDate(next))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
