import type { LucideIcon } from "lucide-react"
import {
  ContactRoundIcon,
  HandCoinsIcon,
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
  formatCurrencyDKK,
  formatInteger,
  formatPercentage,
} from "@/lib/performance/format"
import type { MetricDefinition, MetricId } from "@/lib/performance/types"
import { cn } from "cn"

const KPI_ICONS: Record<MetricId, LucideIcon> = {
  revenue: WalletIcon,
  profit: TrendingUpIcon,
  ltv: HandCoinsIcon,
  cac: UserPlusIcon,
  customers: UsersIcon,
  leads: ContactRoundIcon,
  cpl: MousePointerClickIcon,
  adSpend: MegaphoneIcon,
  closeRate: PercentIcon,
}

const KPI_EXPLANATION_IDS = new Set<MetricId>(["ltv", "cac", "cpl"])

function formatValue(metric: MetricDefinition, value: number | null): string {
  if (value == null) return "–"
  if (metric.format === "currency") return formatCurrencyDKK(value)
  if (metric.format === "percent") return formatPercentage(value)
  return formatInteger(value)
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
  const explanation =
    KPI_EXPLANATION_IDS.has(metric.id) && metric.explanation
      ? metric.explanation
      : null

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="kpi-icon mt-0.5">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-medium tracking-tight text-[#141414]",
            compact ? "text-lg" : "text-xl"
          )}
        >
          {metric.label}
        </p>
        {explanation ? (
          <p className="mt-0.5 truncate text-xs font-normal text-[var(--text-muted)]">
            {explanation}
          </p>
        ) : null}
        <p
          className={cn(
            "mt-1.5 leading-none font-semibold tracking-tight text-[#141414] tabular-nums",
            compact ? "text-[2rem]" : "text-[2.35rem]"
          )}
        >
          {formatValue(metric, value)}
        </p>
      </div>
    </div>
  )
}

export function KpiCard({
  metric,
  value,
}: {
  metric: MetricDefinition
  value: number | null
}) {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0 py-5">
      <div className="px-5">
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
    <Card size="sm" className="dashboard-card kpi-card gap-0 py-5">
      <div className="grid grid-cols-2 gap-4 px-5">
        {items.map((item) => (
          <div key={item.metric.id} className="min-w-0">
            <KpiMetricValue metric={item.metric} value={item.value} compact />
          </div>
        ))}
      </div>
    </Card>
  )
}
