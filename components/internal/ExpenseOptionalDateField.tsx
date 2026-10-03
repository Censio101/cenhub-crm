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

export function ExpenseOptionalDateField({
  label,
  value,
  onChange,
  emptyLabel = "Ingen slutdato",
  "aria-label": ariaLabel,
}: {
  label: string
  value: string | null | undefined
  onChange: (iso: string | null) => void
  emptyLabel?: string
  "aria-label"?: string
}) {
  const [open, setOpen] = useState(false)
  const parsed = parseIsoDate(value ?? null)

  return (
    <div className="grid gap-1 text-sm text-[var(--text-secondary)]">
      <span>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className={`${onboardingFieldClass} min-w-0 flex-1 justify-between gap-2 font-normal`}
                aria-label={ariaLabel ?? label}
              />
            }
          >
            <span>{parsed ? format(parsed, "d. MMM yyyy", { locale: da }) : emptyLabel}</span>
            <CalendarIcon className="size-4 shrink-0 opacity-60" aria-hidden />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <Calendar
              mode="single"
              locale={da}
              selected={parsed ?? undefined}
              defaultMonth={parsed ?? new Date()}
              onSelect={(next) => {
                if (!next) return
                onChange(toIsoDate(next))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        {parsed ? (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2" onClick={() => onChange(null)}>
            Fjern
          </Button>
        ) : null}
      </div>
    </div>
  )
}
