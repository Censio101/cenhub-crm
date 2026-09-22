import { Card } from "@/components/ui/card"
import {
  computeLeadPipelineStats,
  filterDashboardLeads,
  MOCK_LEADS,
} from "@/lib/leads"
import { formatCurrencyDKK, formatInteger } from "@/lib/performance/format"
import { getSegmentShares } from "@/lib/performance/insights"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"
import type {
  DateRange,
  PerformanceDashboardData,
} from "@/lib/performance/types"

export function EconomyInsights({
  data,
  range,
  service,
  funnel,
  segment,
}: {
  data: PerformanceDashboardData
  range: DateRange
  service: ServiceId | null
  funnel: FunnelId | null
  segment: CustomerSegmentId | null
}) {
  const leads = filterDashboardLeads(MOCK_LEADS, {
    range,
    service,
    funnel,
    segment,
  })
  const pipeline = computeLeadPipelineStats(leads)
  const shares = getSegmentShares(data)

  return (
    <Card className="dashboard-card gap-5 px-6 py-5">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          Økonomi på vej
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Det I har lukket, og det der stadig ligger i pipelinen
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Åben pipeline</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {formatCurrencyDKK(pipeline.pipelineValue)}
          </dd>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatInteger(pipeline.openCount)} åbne leads
          </p>
        </div>
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Gns. vundet salg</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {formatCurrencyDKK(pipeline.averageWonSales)}
          </dd>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Bundlinje {formatCurrencyDKK(pipeline.averageWonProfit)}
          </p>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Privat / Erhverv
        </h3>
        <p className="mt-2 text-sm text-[var(--text-primary)]">
          {shares
            .map((item) => `${item.label} ${item.shareLabel}`)
            .join(" · ")}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Andel af lukkede kunder i perioden
        </p>
      </div>
    </Card>
  )
}
