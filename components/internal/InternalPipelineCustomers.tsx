"use client"

import { CalendarClockIcon, TrendingUpIcon } from "lucide-react"

import { LeaderboardServiceIcons } from "@/components/internal/InternalCustomerLeaderboard"
import type { PendingCustomer } from "@/lib/internal/metrics"
import { formatCurrencyDKK } from "@/lib/performance/format"
import { format } from "date-fns"
import { da } from "date-fns/locale"

function formatStart(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "d. MMM yyyy", { locale: da })
}

function pipelineBadge(kind: PendingCustomer["pipelineKind"]) {
  if (kind === "awaiting_start") {
    return {
      label: "Afventer opstart",
      className: "bg-[#E4660C]/12 text-[#E4660C] ring-1 ring-[#E4660C]/25",
    }
  }
  return {
    label: "Skal onboardes",
    className: "bg-amber-500/12 text-amber-800 ring-1 ring-amber-500/25",
  }
}

type InternalPipelineCustomersProps = {
  customers: PendingCustomer[]
  onSelect?: (customer: PendingCustomer) => void
  selectedId?: string | null
  compact?: boolean
}

export function InternalPipelineCustomers({
  customers,
  onSelect,
  selectedId,
  compact = false,
}: InternalPipelineCustomersProps) {
  if (customers.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Ingen kunder afventer opstart lige nu.
      </p>
    )
  }

  const totalExpected = customers.reduce((sum, customer) => sum + customer.expectedMrr, 0)
  const totalGap = customers.reduce((sum, customer) => sum + customer.gapUntilStart, 0)

  return (
    <div className="grid gap-4">
      {!compact ? (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[12px] border border-[#E4660C]/25 bg-gradient-to-r from-[#E4660C]/8 via-white to-white px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E4660C]">
              Pipeline
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {customers.length} kunder · forventet{" "}
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {formatCurrencyDKK(totalExpected)}
              </span>{" "}
              / md. når de er i gang
            </p>
          </div>
          {totalGap > 0 ? (
            <p className="text-xs tabular-nums text-[var(--text-secondary)]">
              Manglende cashflow indtil opstart:{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {formatCurrencyDKK(totalGap)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      <ul className={`grid min-w-0 gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {customers.map((customer) => {
          const badge = pipelineBadge(customer.pipelineKind)
          const open = selectedId === customer.workspaceId
          const inner = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-[var(--text-primary)]">
                    {customer.name}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-[var(--text-secondary)]">
                    {customer.email}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </span>
              <span className="mt-2">
                <LeaderboardServiceIcons lines={customer.lines} />
              </span>
              <span className="mt-3 grid gap-1.5 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden />
                    Opstart {formatStart(customer.expectedStart)}
                  </span>
                  <span className="whitespace-nowrap tabular-nums font-semibold text-[#1f8a62]">
                    {formatCurrencyDKK(customer.expectedMrr)}
                    {"\u00a0/ md."}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUpIcon className="size-3.5 shrink-0" aria-hidden />
                    Forventet værdi (12 mdr.)
                  </span>
                  <span className="tabular-nums font-medium text-[var(--text-primary)]">
                    {formatCurrencyDKK(customer.projectedYearValue)}
                  </span>
                </span>
                {customer.gapUntilStart > 0 ? (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Mangler indtil opstart:{" "}
                    <span className="font-medium tabular-nums text-[var(--text-primary)]">
                      {formatCurrencyDKK(customer.gapUntilStart)}
                    </span>
                  </span>
                ) : null}
              </span>
            </>
          )
          return (
            <li key={customer.workspaceId} className="min-w-0">
              {onSelect ? (
                <button
                  type="button"
                  className={`flex h-full w-full flex-col rounded-[15px] border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md ${
                    open ? "border-[#E4660C] ring-1 ring-[#E4660C]/30" : "border-border"
                  }`}
                  aria-pressed={open}
                  onClick={() => onSelect(customer)}
                >
                  {inner}
                </button>
              ) : (
                <div className="flex h-full flex-col rounded-[15px] border border-border bg-white p-4 shadow-sm">
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
