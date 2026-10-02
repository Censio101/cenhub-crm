import type { LucideIcon } from "lucide-react"
import {
  ContactRoundIcon,
  HandCoinsIcon,
  LineChartIcon,
  MegaphoneIcon,
  MousePointerClickIcon,
  PercentIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  formatCompactNumber,
  formatCurrencyDKK,
  formatInteger,
  formatPercentage,
  formatRoasMultiplier,
} from "@/lib/performance/format"
import type { MetricDefinition, MetricId } from "@/lib/performance/types"
import { cn } from "cn"

const KPI_ICONS: Record<MetricId, LucideIcon> = {
  revenue: WalletIcon,
  profit: TrendingUpIcon,
  roas: LineChartIcon,
  ltv: HandCoinsIcon,
  cac: UserPlusIcon,
  customers: UsersIcon,
  leads: ContactRoundIcon,
  cpl: MousePointerClickIcon,
  adSpend: MegaphoneIcon,
  closeRate: PercentIcon,
}

const KPI_EXPLANATION_IDS = new Set<MetricId>(["ltv", "cac", "cpl", "roas"])

function formatValue(metric: MetricDefinition, value: number | null): string {
  if (value == null) return "–"
  if (metric.format === "currency") return formatCurrencyDKK(value)
  if (metric.format === "percent") return formatPercentage(value)
  if (metric.format === "roas") return formatRoasMultiplier(value)
  return formatInteger(value)
}

/** Compact half-cards use shorter currency when full formatting would overflow. */
function formatDisplayValue(
  metric: MetricDefinition,
  value: number | null,
  compact?: boolean
): string {
  const full = formatValue(metric, value)
  if (!compact || value == null || metric.format !== "currency") return full
  if (full.replace(/\s/g, "").length >= 10) {
    return `${formatCompactNumber(value)}\u00a0kr.`
  }
  return full
}

/** Shrink KPI values when formatted strings are long (merged cards, large kr. amounts). */
function valueTextClass(formatted: string, compact?: boolean): string {
  const len = formatted.replace(/\s/g, "").length
  if (compact) {
    if (len >= 13) return "text-base leading-tight"
    if (len >= 10) return "text-lg leading-tight"
    if (len >= 8) return "text-xl leading-tight"
    return "text-2xl leading-none"
  }
  if (len >= 14) return "text-[1.65rem] leading-none"
  if (len >= 11) return "text-[2rem] leading-none"
  return "text-[2.35rem] leading-none"
}

function KpiMetricValue({
  metric,
  value,
  compact,
}: {
  metric: MetricDefinition
  value: number | null
  compact?: boolean
}) {
  const Icon = KPI_ICONS[metric.id]
  const fullFormatted = formatValue(metric, value)
  const formatted = formatDisplayValue(metric, value, compact)
  const explanation =
    KPI_EXPLANATION_IDS.has(metric.id) && metric.explanation
      ? metric.explanation
      : null

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="kpi-icon mt-0.5 shrink-0">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Fixed-height label block so values align across cards with/without subtitles. */}
        <div
          className={cn(
            "flex min-w-0 flex-col",
            compact ? "min-h-[2.625rem]" : "min-h-[2.875rem]"
          )}
        >
          <p
            className={cn(
              "truncate font-medium leading-snug tracking-tight text-[#141414]",
              compact ? "text-base" : "text-xl"
            )}
          >
            {metric.label}
          </p>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 min-h-[1.125rem] text-xs leading-snug font-normal text-[var(--text-muted)]",
              !explanation && "invisible"
            )}
            aria-hidden={!explanation}
          >
            {explanation ?? "\u00a0"}
          </p>
        </div>
        <p
          className={cn(
            "mt-2 min-w-0 max-w-full overflow-hidden font-semibold tracking-tight text-ellipsis whitespace-nowrap text-[#141414] tabular-nums",
            valueTextClass(formatted, compact)
          )}
          title={fullFormatted !== formatted ? fullFormatted : undefined}
        >
          {formatted}
        </p>
      </div>
    </div>
  )
}

const KPI_CARD_BODY_CLASS = "flex min-h-[7.25rem] flex-col justify-center py-5"

export function KpiCard({
  metric,
  value,
}: {
  metric: MetricDefinition
  value: number | null
}) {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0">
      <div className={cn(KPI_CARD_BODY_CLASS, "px-5")}>
        <KpiMetricValue metric={metric} value={value} />
      </div>
    </Card>
  )
}

export function CombinedKpiCard({
  items,
}: {
  items: Array<{
    metric: MetricDefinition
    value: number | null
  }>
}) {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0">
      <div className={cn(KPI_CARD_BODY_CLASS, "grid grid-cols-2 gap-x-3 gap-y-0 px-4 sm:gap-x-4 sm:px-5")}>
        {items.map((item) => (
          <div key={item.metric.id} className="min-w-0 overflow-hidden">
            <KpiMetricValue metric={item.metric} value={item.value} compact />
          </div>
        ))}
      </div>
    </Card>
  )
}
