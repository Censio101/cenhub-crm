import { CUSTOMER_SEGMENTS } from "./customer-segments"
import type { CustomerSegmentId } from "./customer-segments"
import { FUNNELS } from "./funnels"
import type { FunnelId } from "./funnels"
import {
  formatCurrencyDKK,
  formatInteger,
  formatPercentage,
  formatRoasMultiplier,
} from "./format"
import { getPerformanceDashboard } from "./get-performance"
import { computeDelta, computeProfit, getMetric, safeDivide } from "./metrics"
import type { ServiceId } from "./services"
import type {
  DashboardQuery,
  PeriodTotals,
  PerformanceDashboardData,
} from "./types"

export function computeRoas(totals: PeriodTotals): number | null {
  return safeDivide(totals.revenue, totals.adSpend)
}

export function buildValueStory(
  current: PeriodTotals,
  comparison: PeriodTotals | null
): {
  spend: string
  leads: string
  customers: string
  revenue: string
  profit: string
  roas: string
  roasValue: number | null
  comparisonLines: string[]
} {
  const profit = computeProfit(current)
  const roas = computeRoas(current)
  const comparisonLines: string[] = []

  if (comparison) {
    const customerDelta = computeDelta(
      current.customers,
      comparison.customers,
      "up"
    )
    if (customerDelta.absolute != null && customerDelta.absolute !== 0) {
      const count = formatInteger(Math.abs(customerDelta.absolute))
      comparisonLines.push(
        customerDelta.absolute > 0
          ? `${count} flere kunder end forrige periode`
          : `${count} færre kunder end forrige periode`
      )
    }

    const cpl = getMetric("cpl")
    const cplDelta = computeDelta(
      cpl.compute(current),
      cpl.compute(comparison),
      "down"
    )
    if (cplDelta.absolute != null && Math.round(cplDelta.absolute) !== 0) {
      const amount = formatCurrencyDKK(Math.abs(cplDelta.absolute))
      comparisonLines.push(
        cplDelta.absolute < 0 ? `CPL ${amount} lavere` : `CPL ${amount} højere`
      )
    }
  }

  return {
    spend: formatCurrencyDKK(current.adSpend),
    leads: formatInteger(current.leads),
    customers: formatInteger(current.customers),
    revenue: formatCurrencyDKK(current.revenue),
    profit: formatCurrencyDKK(profit),
    roas: formatRoasMultiplier(roas),
    roasValue: roas,
    comparisonLines,
  }
}

export type ChannelInsight = {
  id: FunnelId
  label: string
  cpl: number | null
  closeRate: number | null
  revenue: number | null
  cplLabel: string
  closeRateLabel: string
  revenueLabel: string
}

export function getChannelInsights(
  query: Omit<DashboardQuery, "funnel">
): ChannelInsight[] {
  const cpl = getMetric("cpl")
  const closeRate = getMetric("closeRate")

  return FUNNELS.map((funnel) => {
    const data = getPerformanceDashboard({ ...query, funnel: funnel.id })
    const totals = data.current.totals
    const cplValue = cpl.compute(totals)
    const closeRateValue = closeRate.compute(totals)
    return {
      id: funnel.id,
      label: funnel.label,
      cpl: cplValue,
      closeRate: closeRateValue,
      revenue: totals.revenue,
      cplLabel: formatCurrencyDKK(cplValue),
      closeRateLabel: formatPercentage(closeRateValue),
      revenueLabel: formatCurrencyDKK(totals.revenue),
    }
  })
}

export type ServiceInsight = {
  id: ServiceId
  label: string
  leads: number
  customers: number
  profit: number
  leadsLabel: string
  customersLabel: string
  profitLabel: string
}

export function getServiceInsights(
  query: Omit<DashboardQuery, "service">,
  services: ReadonlyArray<{ id: ServiceId; label: string }>
): ServiceInsight[] {
  return services.map((service) => {
    const data = getPerformanceDashboard({ ...query, service: service.id })
    const totals = data.current.totals
    const profit = computeProfit(totals)
    return {
      id: service.id,
      label: service.label,
      leads: totals.leads,
      customers: totals.customers,
      profit,
      leadsLabel: formatInteger(totals.leads),
      customersLabel: formatInteger(totals.customers),
      profitLabel: formatCurrencyDKK(profit),
    }
  })
}

export type SegmentShare = {
  id: CustomerSegmentId
  label: string
  customers: number
  share: number | null
  shareLabel: string
}

export function getSegmentShares(data: PerformanceDashboardData): SegmentShare[] {
  const totals = data.current.totals
  const b2b = totals.b2bCustomers ?? 0
  const b2c = totals.b2cCustomers ?? 0
  const total = b2b + b2c || totals.customers

  return CUSTOMER_SEGMENTS.map((segment) => {
    const customers = segment.id === "b2b" ? b2b : b2c
    const share = total === 0 ? null : (customers / total) * 100
    return {
      id: segment.id,
      label: segment.label,
      customers,
      share,
      shareLabel: formatPercentage(share),
    }
  })
}
