"use client"

import { CENSIO_SERVICES, lineMatchesService } from "@/lib/internal/services"
import type { CommercialLine } from "@/lib/onboarding/types"
import { formatCurrencyDKK } from "@/lib/performance/format"

export type LeaderboardCustomer = {
  workspaceId: string
  name: string
  mrr: number
  spent: number
  lines: CommercialLine[]
}

const LEADER_GREEN = "#46C7A0"
const LEADER_GREEN_DARK = "#1f8a62"

export function LeaderboardServiceIcons({
  lines,
  compact = false,
}: {
  lines: CommercialLine[]
  compact?: boolean
}) {
  const held = CENSIO_SERVICES.filter((service) => lines.some((line) => lineMatchesService(line, service.id)))
  if (held.length === 0) {
    return null
  }
  return (
    <ul
      className="flex shrink-0 flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label={held.map((service) => service.label).join(", ")}
    >
      {held.map((service) => {
        const Icon = service.icon
        return (
          <li key={service.id} className="shrink-0" title={service.label}>
            <Icon
              className={compact ? "size-3.5" : "size-5"}
              style={{ color: service.color }}
              aria-hidden
            />
          </li>
        )
      })}
    </ul>
  )
}

function rankBadgeClass(index: number) {
  if (index === 0) return "bg-[#1f8a62] text-white"
  if (index === 1) return "bg-[#46C7A0]/25 text-[#1f8a62]"
  if (index === 2) return "bg-[#46C7A0]/15 text-[#1f8a62]"
  return "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
}

export function InternalCustomerLeaderboard({ customers }: { customers: LeaderboardCustomer[] }) {
  if (customers.length === 0) {
    return <p className="py-2 text-sm text-[var(--text-secondary)]">Ingen kunder i det valgte overblik.</p>
  }

  const maxSpent = customers[0]?.spent ?? 0

  return (
    <ol className="divide-y divide-border">
      {customers.map((customer, index) => {
        const widthPct = maxSpent > 0 ? Math.max(6, (customer.spent / maxSpent) * 100) : 0
        const isLeader = index === 0
        return (
          <li
            key={customer.workspaceId}
            className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 py-2 sm:grid-cols-[1.75rem_minmax(0,1fr)_auto_auto_minmax(5rem,1.2fr)] sm:gap-x-3 ${
              isLeader ? "bg-[#46C7A0]/[0.06]" : ""
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankBadgeClass(index)}`}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">{customer.name}</p>
              <LeaderboardServiceIcons lines={customer.lines} compact />
            </div>
            <p className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-[var(--text-primary)]">
              <span className="font-semibold text-[#1f8a62]">{formatCurrencyDKK(customer.mrr)}</span>
              <span className="text-[var(--text-secondary)]">{"\u00a0/md."}</span>
            </p>
            <p className="hidden shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-[var(--text-secondary)] sm:block">
              {formatCurrencyDKK(customer.spent)}
            </p>
            <div
              className="col-span-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)] sm:col-span-1 sm:col-start-5"
              role="img"
              aria-label={`${Math.round(widthPct)} procent af topkundens omsætning`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPct}%`,
                  backgroundImage: `linear-gradient(90deg, ${LEADER_GREEN}, ${LEADER_GREEN_DARK})`,
                }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
