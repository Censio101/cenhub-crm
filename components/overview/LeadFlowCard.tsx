import Link from "next/link"

import { Card } from "@/components/ui/card"
import {
  computeLeadFunnel,
  filterDashboardLeads,
  getActionLeads,
  getLeadStatusLabel,
  MOCK_LEADS,
} from "@/lib/leads"
import { formatPercentage } from "@/lib/performance/format"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"
import type { DateRange } from "@/lib/performance/types"

export function LeadFlowCard({
  range,
  service,
  funnel,
  segment,
}: {
  range: DateRange
  service: ServiceId | null
  funnel: FunnelId | null
  segment: CustomerSegmentId | null
}) {
  const periodLeads = filterDashboardLeads(MOCK_LEADS, {
    range,
    service,
    funnel,
    segment,
  })
  const actionLeads = getActionLeads(
    filterDashboardLeads(MOCK_LEADS, {
      service,
      funnel,
      segment,
      ignoreDate: true,
    })
  ).slice(0, 5)
  const steps = computeLeadFunnel(periodLeads)

  return (
    <Card className="dashboard-card gap-5 px-6 py-5">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          Leadflow
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Fra første kontakt til vundet kunde i den valgte periode
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="rounded-[5px] border border-[var(--border-subtle)] bg-white px-3 py-3"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {index > 0 ? `${index}. ` : ""}
              {step.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
              {step.count}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {step.share == null ? "–" : formatPercentage(step.share)} af leads
            </p>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Kræver handling
        </h3>
        {actionLeads.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ingen leads venter på opkald eller svar fra jer.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
            {actionLeads.map((lead) => (
              <li key={lead.id} className="flex items-baseline justify-between gap-3 py-2">
                <Link
                  href="/leads"
                  className="truncate text-sm font-medium text-[var(--text-primary)] hover:underline"
                >
                  {lead.fullName}
                </Link>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {getLeadStatusLabel(lead.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
