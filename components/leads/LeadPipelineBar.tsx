import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import type { LeadPipelineStats } from "@/lib/leads"
import { cn } from "cn"

function danishCount(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export function LeadPipelineBar({
  stats,
  description = "Fordeling af tabt, åbne leads og lukkede kunder",
}: {
  stats: LeadPipelineStats
  description?: string
}) {
  const segments = [
    {
      id: "lost",
      label: "Tabt",
      value: stats.lostValue,
      count: danishCount(stats.lostCount, "mistet lead", "mistede leads"),
      bar: "bg-[#c45c4a]",
      swatch: "bg-[#c45c4a]",
    },
    {
      id: "open",
      label: "Åbne leads",
      value: stats.pipelineValue,
      count: danishCount(stats.openCount, "åbent lead", "åbne leads"),
      bar: "bg-[#5b7fb8]",
      swatch: "bg-[#5b7fb8]",
    },
    {
      id: "won",
      label: "Lukkede kunder",
      value: stats.wonValue,
      count: danishCount(stats.wonCount, "vundet kunde", "vundne kunder"),
      bar: "bg-[#5a9a78]",
      swatch: "bg-[#5a9a78]",
    },
  ] as const
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  function shareOfTotal(value: number) {
    return total <= 0 ? 0 : (value / total) * 100
  }

  return (
    <section className="dashboard-card gap-0 px-6 py-5" aria-label="Pipeline">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Pipeline
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>

      <div
        className="mt-5 flex h-2 overflow-hidden rounded-full bg-[#efe8e1]"
        role="img"
        aria-label={`Pipeline: tabt ${formatCurrencyDKK(stats.lostValue)} (${formatPercentage(shareOfTotal(stats.lostValue))}), åbne leads ${formatCurrencyDKK(stats.pipelineValue)} (${formatPercentage(shareOfTotal(stats.pipelineValue))}), lukkede kunder ${formatCurrencyDKK(stats.wonValue)} (${formatPercentage(shareOfTotal(stats.wonValue))})`}
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
              <span
                className={cn("size-2 shrink-0 rounded-full", segment.swatch)}
                aria-hidden
              />
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
