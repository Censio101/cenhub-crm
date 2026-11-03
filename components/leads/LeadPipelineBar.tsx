"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import type { LeadPipelineStats } from "@/lib/leads"
import { cn } from "cn"

export function LeadPipelineBar({
  stats,
  description,
  compact = false,
}: {
  stats: LeadPipelineStats
  description?: string
  /** One slim row (used above the lead sheet so the table gets the room). */
  compact?: boolean
}) {
  const { t } = useLanguage()
  const resolvedDescription = description ?? t("leadSheetPipelineBarDesc")

  const segments = [
    {
      id: "lost",
      label: t("leadSheetPipelineLostLabel"),
      value: stats.lostValue,
      count: `${stats.lostCount}`,
      bar: "bg-[#c45c4a]",
      swatch: "bg-[#c45c4a]",
    },
    {
      id: "open",
      label: t("leadSheetPipelineOpenLabel"),
      value: stats.pipelineValue,
      count: `${stats.openCount}`,
      bar: "bg-[#5b7fb8]",
      swatch: "bg-[#5b7fb8]",
    },
    {
      id: "won",
      label: t("leadSheetPipelineWonLabel"),
      value: stats.wonValue,
      count: `${stats.wonCount}`,
      bar: "bg-[#5a9a78]",
      swatch: "bg-[#5a9a78]",
    },
  ] as const
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  function shareOfTotal(value: number) {
    return total <= 0 ? 0 : (value / total) * 100
  }

  if (compact) {
    return (
      <section
        className="dashboard-card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"
        aria-label={t("leadSheetPipelineOpen")}
      >
        <h2 className="text-sm font-medium tracking-tight text-[var(--text-primary)]">
          {t("leadSheetPipelineOpen")}
        </h2>
        <div
          className="flex h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-[#efe8e1]"
          role="img"
          aria-label={resolvedDescription}
        >
          {segments.map((segment) => {
            const share = shareOfTotal(segment.value)
            if (share <= 0) return null
            return (
              <div
                key={segment.id}
                className={cn("h-full min-w-0", segment.bar)}
                style={{ width: `${share}%` }}
              />
            )
          })}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {segments.map((segment) => (
            <li key={segment.id} className="flex items-center gap-2 text-xs">
              <span className={cn("size-2 shrink-0 rounded-full", segment.swatch)} aria-hidden />
              <span className="font-medium text-[var(--text-primary)]">{segment.label}</span>
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {formatCurrencyDKK(segment.value)}
              </span>
              <span className="text-[var(--text-muted)]">{segment.count}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="dashboard-card gap-0 px-6 py-5" aria-label={t("leadSheetPipelineOpen")}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            {t("leadSheetPipelineOpen")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{resolvedDescription}</p>
        </div>
      </div>

      <div
        className="mt-5 flex h-2 overflow-hidden rounded-full bg-[#efe8e1]"
        role="img"
        aria-label={resolvedDescription}
      >
        {segments.map((segment) => {
          const share = shareOfTotal(segment.value)
          if (share <= 0) return null
          return (
            <div
              key={segment.id}
              className={cn("h-full min-w-0", segment.bar)}
              style={{ width: `${share}%` }}
            />
          )
        })}
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {segments.map((segment) => (
          <li key={segment.id} className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <span className={cn("size-2 shrink-0 rounded-full", segment.swatch)} aria-hidden />
              {segment.label}
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--text-primary)]">
              {formatCurrencyDKK(segment.value)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {formatPercentage(shareOfTotal(segment.value))} · {segment.count}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
