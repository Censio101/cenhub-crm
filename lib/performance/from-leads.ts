import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns"

import {
  getLeadServiceIds,
  type Lead,
  type LeadStatusId,
} from "@/lib/leads"
import { isFunnelId, type FunnelId } from "./funnels"
import { isServiceId, type ServiceId } from "./services"
import { monthKeyFromDate } from "./demo-ad-spend"
import { toIsoDate } from "./date-ranges"
import type { PerformanceBucket } from "./types"

const QUOTE_STATUSES = new Set<LeadStatusId>([
  "awaiting_proposal",
  "proposal_sent",
  "won",
])

const QUALIFIED_STATUSES = new Set<LeadStatusId>([
  "call_1",
  "call_2",
  "call_3",
  "call_4",
  "call_5",
  "waiting_on_client",
  "client_waiting_on_us",
  "awaiting_proposal",
  "proposal_sent",
  "won",
])

type BucketKey = string

function bucketKey(date: string, service: ServiceId | "", funnel: FunnelId | ""): BucketKey {
  return `${date}|${service}|${funnel}`
}

function emptyBucket(
  date: string,
  service?: ServiceId,
  funnel?: FunnelId
): PerformanceBucket {
  return {
    start: date,
    end: date,
    leads: 0,
    customers: 0,
    b2bCustomers: 0,
    b2cCustomers: 0,
    revenue: 0,
    adSpend: 0,
    profit: 0,
    qualified: 0,
    quotes: 0,
    service,
    funnel,
  }
}

function resolveLeadFunnel(lead: Lead): FunnelId | "" {
  if (lead.platform && isFunnelId(lead.platform)) return lead.platform
  return ""
}

function resolveLeadServices(lead: Lead): ServiceId[] {
  const ids = getLeadServiceIds(lead).filter(isServiceId)
  return ids.length > 0 ? ids : []
}

function addLeadContribution(
  buckets: Map<BucketKey, PerformanceBucket>,
  lead: Lead
) {
  const date = lead.date
  const funnel = resolveLeadFunnel(lead)
  const services = resolveLeadServices(lead)
  const serviceTargets: (ServiceId | "")[] =
    services.length > 0 ? services : [""]
  const share = 1 / serviceTargets.length
  const isWon = lead.status === "won"
  const revenue =
    isWon && lead.salesPrice != null && Number.isFinite(lead.salesPrice)
      ? lead.salesPrice * share
      : 0
  const profit =
    isWon && lead.profit != null && Number.isFinite(lead.profit)
      ? lead.profit * share
      : 0
  const qualified = QUALIFIED_STATUSES.has(lead.status) ? share : 0
  const quotes = QUOTE_STATUSES.has(lead.status) ? share : 0

  for (const service of serviceTargets) {
    const key = bucketKey(date, service, funnel)
    const bucket =
      buckets.get(key) ??
      emptyBucket(
        date,
        service || undefined,
        funnel || undefined
      )

    bucket.leads += share
    if (isWon) {
      bucket.customers += share
      if (lead.segment === "b2b") bucket.b2bCustomers = (bucket.b2bCustomers ?? 0) + share
      if (lead.segment === "b2c") bucket.b2cCustomers = (bucket.b2cCustomers ?? 0) + share
    }
    bucket.revenue += revenue
    bucket.profit = (bucket.profit ?? 0) + profit
    bucket.qualified = (bucket.qualified ?? 0) + qualified
    bucket.quotes = (bucket.quotes ?? 0) + quotes

    buckets.set(key, bucket)
  }
}

function distributeAdSpend(
  buckets: Map<BucketKey, PerformanceBucket>,
  adSpendByMonth: Record<string, number>
) {
  const byMonth = new Map<string, PerformanceBucket[]>()

  for (const bucket of buckets.values()) {
    const monthKey = monthKeyFromDate(bucket.start)
    const group = byMonth.get(monthKey)
    if (group) group.push(bucket)
    else byMonth.set(monthKey, [bucket])
  }

  for (const [monthKey, monthBuckets] of byMonth) {
    const monthSpend = adSpendByMonth[monthKey] ?? 0
    if (monthSpend <= 0) continue

    const monthLeadWeight = monthBuckets.reduce((sum, bucket) => sum + bucket.leads, 0)
    if (monthLeadWeight <= 0) continue

    for (const bucket of monthBuckets) {
      bucket.adSpend = (monthSpend * bucket.leads) / monthLeadWeight
    }
  }
}

export function buildDailyBucketsFromLeads(
  leads: readonly Lead[],
  adSpendByMonth: Record<string, number> = {}
): PerformanceBucket[] {
  const buckets = new Map<BucketKey, PerformanceBucket>()

  for (const lead of leads) {
    addLeadContribution(buckets, lead)
  }

  distributeAdSpend(buckets, adSpendByMonth)

  return [...buckets.values()].sort((left, right) =>
    left.start.localeCompare(right.start)
  )
}

export function getLeadDataDateRange(
  leads: readonly Lead[]
): { start: string; end: string } | null {
  if (leads.length === 0) return null

  let min = leads[0].date
  let max = leads[0].date
  for (const lead of leads) {
    if (lead.date < min) min = lead.date
    if (lead.date > max) max = lead.date
  }
  return { start: min, end: max }
}

export function fillMonthRangeGaps(
  buckets: PerformanceBucket[],
  adSpendByMonth: Record<string, number>
): PerformanceBucket[] {
  const range = buckets.length
    ? {
        start: buckets[0].start,
        end: buckets[buckets.length - 1].end,
      }
    : null

  if (!range) return buckets

  const start = startOfMonth(new Date(`${range.start}T00:00:00`))
  const end = endOfMonth(new Date(`${range.end}T00:00:00`))
  const months = eachDayOfInterval({ start, end })
    .filter((day, index, all) => {
      const key = monthKeyFromDate(toIsoDate(day))
      const prev = index > 0 ? monthKeyFromDate(toIsoDate(all[index - 1])) : null
      return key !== prev
    })
    .map((day) => monthKeyFromDate(toIsoDate(day)))

  const existingMonths = new Set(
    buckets.map((bucket) => monthKeyFromDate(bucket.start))
  )

  const extras: PerformanceBucket[] = []
  for (const monthKey of months) {
    if (existingMonths.has(monthKey)) continue
    const spend = adSpendByMonth[monthKey]
    if (spend == null || spend <= 0) continue

    const monthStart = startOfMonth(new Date(`${monthKey}-01T00:00:00`))
    const monthEnd = endOfMonth(monthStart)
    extras.push({
      start: toIsoDate(monthStart),
      end: toIsoDate(monthEnd),
      leads: 0,
      customers: 0,
      b2bCustomers: 0,
      b2cCustomers: 0,
      revenue: 0,
      adSpend: spend,
      profit: 0,
      qualified: 0,
      quotes: 0,
    })
  }

  return [...buckets, ...extras].sort((left, right) =>
    left.start.localeCompare(right.start)
  )
}
