"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import { pipelineSegmentSharePercent, type LeadPipelineStats } from "@/lib/leads"
import { cn } from "cn"

export function LeadPipelineBar({
  stats,
  description,
}: {
  stats: LeadPipelineStats
  description?: string
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

  return (
    <section
      className="dashboard-card gap-0 px-5 py-3.5 sm:px-6"
      aria-label={t("leadSheetPipelineOpen")}
    >
      <div>
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)] sm:text-xl">
          {t("leadSheetPipelineOpen")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)] sm:text-base">{resolvedDescription}</p>
      </div>

      <div
        className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-[#efe8e1]"
        role="img"
        aria-label={resolvedDescription}
      >
        {segments.map((segment) => {
          const share = pipelineSegmentSharePercent(stats, segment.id)
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

      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {segments.map((segment) => {
          const share = pipelineSegmentSharePercent(stats, segment.id)
          return (
            <li key={segment.id} className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] sm:text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", segment.swatch)} aria-hidden />
                {segment.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)] sm:text-xl">
                {formatCurrencyDKK(segment.value)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {formatPercentage(share)} · {segment.count}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
