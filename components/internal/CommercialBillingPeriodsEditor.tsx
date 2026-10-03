"use client"

import type { CommercialBillingPeriod, CommercialLine } from "@/lib/onboarding/types"
import { onboardingFieldClass } from "@/components/onboarding/field"
import { Button } from "@/components/ui/button"
import { ExpenseDateField } from "@/components/internal/ExpenseDateField"
import { ExpenseOptionalDateField } from "@/components/internal/ExpenseOptionalDateField"
import { resolveBillingPeriods, sortBillingPeriods } from "@/lib/internal/commercial-billing"
import { parseIsoDate, toIsoDate } from "@/lib/performance/date-ranges"

function addDaysIso(iso: string, days: number) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function syncAmountFromPeriods(periods: CommercialBillingPeriod[]) {
  const open = [...periods].reverse().find((period) => !period.to)
  return open?.amount ?? periods[periods.length - 1]?.amount ?? 0
}

export function CommercialBillingPeriodsEditor({
  line,
  onChange,
}: {
  line: CommercialLine
  onChange: (patch: Partial<CommercialLine>) => void
}) {
  const periods = sortBillingPeriods(resolveBillingPeriods(line))

  function updatePeriods(next: CommercialBillingPeriod[]) {
    const sorted = sortBillingPeriods(next)
    onChange({ billingPeriods: sorted, amount: syncAmountFromPeriods(sorted) })
  }

  function patchPeriod(id: string, patch: Partial<CommercialBillingPeriod>) {
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
        note: "",
      },
    ])
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Månedlig prishistorik</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          Angiv pris fra dato til dato. Brug 0 kr. ved pause. Skriv note ved op eller ned.
        </p>
      </div>
      <div className="grid gap-3">
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="grid gap-3 rounded-[12px] border border-border bg-white p-3 sm:grid-cols-2"
          >
            <ExpenseDateField
              label="Gælder fra"
              value={period.from}
              aria-label={`Gælder fra, periode ${index + 1}`}
              onChange={(from) => patchPeriod(period.id, { from })}
            />
            <ExpenseOptionalDateField
              label="Gælder til"
              value={period.to}
              emptyLabel="Fortsætter"
              aria-label={`Gælder til, periode ${index + 1}`}
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
            <label className="grid gap-1 text-sm text-[var(--text-secondary)] sm:col-span-2">
              Note
              <input
                className={onboardingFieldClass}
                value={period.note ?? ""}
                placeholder="Fx højere mediebudget, pause eller ny aftale"
                aria-label={`Note, periode ${index + 1}`}
                onChange={(event) => patchPeriod(period.id, { note: event.target.value })}
              />
            </label>
            {periods.length > 1 ? (
              <div className="sm:col-span-2">
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
        Tilføj prisperiode
      </Button>
    </div>
  )
}
