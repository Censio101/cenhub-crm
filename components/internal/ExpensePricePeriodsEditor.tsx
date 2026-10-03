"use client"

import type { ExpensePricePeriod, FixedExpense } from "@/lib/onboarding/types"
import { onboardingFieldClass } from "@/components/onboarding/field"
import { Button } from "@/components/ui/button"
import { ExpenseDateField } from "@/components/internal/ExpenseDateField"
import { ExpenseOptionalDateField } from "@/components/internal/ExpenseOptionalDateField"
import { sortPricePeriods } from "@/lib/internal/expenses"
import { parseIsoDate, toIsoDate } from "@/lib/performance/date-ranges"

function addDaysIso(iso: string, days: number) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function syncAmountFromPeriods(periods: ExpensePricePeriod[]) {
  const open = [...periods].reverse().find((period) => !period.to)
  return open?.amount ?? periods[periods.length - 1]?.amount ?? 0
}

export function ExpensePricePeriodsEditor({
  line,
  onChange,
}: {
  line: FixedExpense
  onChange: (patch: Partial<FixedExpense>) => void
}) {
  const periods = sortPricePeriods(line.pricePeriods)

  function updatePeriods(next: ExpensePricePeriod[]) {
    const sorted = sortPricePeriods(next)
    onChange({ pricePeriods: sorted, amount: syncAmountFromPeriods(sorted) })
  }

  function patchPeriod(id: string, patch: Partial<ExpensePricePeriod>) {
    updatePeriods(periods.map((period) => (period.id === id ? { ...period, ...patch } : period)))
  }

  function addPeriod() {
    const last = periods[periods.length - 1]
    const from = last?.to ? addDaysIso(last.to, 1) : line.startsOn
    const closed = periods.map((period, index) =>
      index === periods.length - 1 && !period.to && last
        ? { ...period, to: addDaysIso(from, -1) }
        : period
    )
    updatePeriods([
      ...closed,
      {
        id: crypto.randomUUID(),
        from,
        to: line.endsOn ?? null,
        amount: last?.amount ?? line.amount,
      },
    ])
  }

  return (
    <div className="grid gap-3 md:col-span-2">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Prishistorik</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          Angiv månedlig pris fra dato til dato, hvis beløbet ændrer sig.
        </p>
      </div>
      <div className="grid gap-3">
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="grid gap-3 rounded-[12px] border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(0,8rem)_auto]"
          >
            <ExpenseDateField
              label="Pris gælder fra"
              value={period.from}
              aria-label={`Pris gælder fra, periode ${index + 1}`}
              onChange={(from) => patchPeriod(period.id, { from })}
            />
            <ExpenseOptionalDateField
              label="Pris gælder til"
              value={period.to}
              emptyLabel="Fortsætter"
              aria-label={`Pris gælder til, periode ${index + 1}`}
              onChange={(to) => patchPeriod(period.id, { to })}
            />
            <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
              Pris pr. md.
              <input
                className={onboardingFieldClass}
                inputMode="numeric"
                value={period.amount ? String(period.amount) : ""}
                aria-label={`Pris pr. måned, periode ${index + 1}`}
                onChange={(event) =>
                  patchPeriod(period.id, {
                    amount: Number(event.target.value.replace(/[^\d]/g, "") || 0),
                  })
                }
              />
            </label>
            {periods.length > 1 ? (
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => updatePeriods(periods.filter((item) => item.id !== period.id))}
                >
                  Fjern periode
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addPeriod}>
        Tilføj prisændring
      </Button>
    </div>
  )
}
