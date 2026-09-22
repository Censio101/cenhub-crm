import { Card } from "@/components/ui/card"
import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
import {
  getChannelInsights,
  getServiceInsights,
} from "@/lib/performance/insights"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import { isServiceId, type ServiceId } from "@/lib/performance/services"
import type { DateRange } from "@/lib/performance/types"

export function MarketingCompare({
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
  const { enabledServices } = useCompanyServices()
  const channels = getChannelInsights({
    range,
    service,
    segment,
  })
  const services = getServiceInsights(
    {
      range,
      funnel,
      segment,
    },
    enabledServices.filter((service): service is { id: ServiceId; label: string } =>
      isServiceId(service.id)
    )
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="dashboard-card gap-4 px-6 py-5">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Hvilken kanal virker
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            CPL, lukke rate og omsætning pr. funnel
          </p>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {channels.map((channel) => (
            <li
              key={channel.id}
              className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-baseline"
            >
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {channel.label}
              </p>
              <p className="text-sm tabular-nums text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">CPL </span>
                {channel.cplLabel}
              </p>
              <p className="text-sm tabular-nums text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">Lukke rate </span>
                {channel.closeRateLabel}
              </p>
              <p className="text-sm tabular-nums text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">Omsætning </span>
                {channel.revenueLabel}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="dashboard-card gap-4 px-6 py-5">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Hvilken ydelse tjener
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Leads, lukkede kunder og bundlinje pr. service
          </p>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Tilføj services under Indstillinger for at se fordelingen.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {services.map((item) => (
              <li
                key={item.id}
                className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-baseline"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {item.label}
                </p>
                <p className="text-sm tabular-nums text-[var(--text-primary)]">
                  <span className="text-[var(--text-muted)]">Leads </span>
                  {item.leadsLabel}
                </p>
                <p className="text-sm tabular-nums text-[var(--text-primary)]">
                  <span className="text-[var(--text-muted)]">Lukkede </span>
                  {item.customersLabel}
                </p>
                <p className="text-sm tabular-nums text-[var(--text-primary)]">
                  <span className="text-[var(--text-muted)]">Bundlinje </span>
                  {item.profitLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
