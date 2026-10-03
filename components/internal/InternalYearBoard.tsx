"use client"

import { useEffect, useState } from "react"
import { CalendarRangeIcon, TrendingUpIcon, WalletIcon } from "lucide-react"

import { InternalKpiCard } from "@/components/internal/InternalKpiCard"
import { InternalMonthSheet } from "@/components/internal/InternalMonthSheet"
import { loadInternalOverview } from "@/components/internal/overview"
import { YearSelect } from "@/components/internal/YearSelect"
import type { InternalOverview } from "@/lib/internal/metrics"
import { formatCurrencyDKK, formatSignedCurrency } from "@/lib/performance/format"

export function InternalYearBoard() {
  const [overview, setOverview] = useState<InternalOverview | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadInternalOverview(year ?? undefined)
      .then((payload) => {
        if (!active) return
        setOverview(payload)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Kunne ikke hente årsarket.")
      })
    return () => {
      active = false
    }
  }, [year])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!overview) {
    return <p className="text-sm text-[var(--text-secondary)]">Henter årsark…</p>
  }

  const change =
    overview.previousYearTotal == null
      ? null
      : overview.yearTotal - overview.previousYearTotal

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Akkumuleret {overview.year}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Løbende sum fra januar til december
          </p>
        </div>
        <YearSelect years={overview.years} value={overview.year} onChange={setYear} />
      </header>
      <section aria-label="Årstal">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InternalKpiCard
            label="Årets total"
            value={formatCurrencyDKK(overview.yearTotal)}
            icon={WalletIcon}
          />
          <InternalKpiCard
            label="Året før"
            value={
              overview.previousYearTotal == null
                ? "–"
                : formatCurrencyDKK(overview.previousYearTotal)
            }
            icon={CalendarRangeIcon}
          />
          <InternalKpiCard
            label="Fremgang"
            value={change == null ? "–" : formatSignedCurrency(change)}
            icon={TrendingUpIcon}
          />
        </div>
      </section>
      <InternalMonthSheet
        title={`Januar til december ${overview.year}`}
        description="Hver måned viser omsætningen og den løbende sum fra januar"
        months={overview.months}
        rows={[
          { label: "Omsætning", values: overview.months.map((month) => month.revenue) },
          {
            label: "Akkumuleret",
            values: overview.months.map((month) => month.cumulative),
          },
        ]}
      />
    </div>
  )
}
