import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns"

import { b2bShare } from "./customer-segments"
import { toIsoDate } from "./date-ranges"
import {
  FUNNELS,
  funnelAdSpendShare,
  funnelVolumeShare,
} from "./funnels"
import { SERVICES, serviceShare } from "./services"
import type { PerformanceBucket } from "./types"

type MonthSeed = {
  year: number
  month: number
  leads: number
  customers: number
  revenue: number
  adSpend: number
  qualified: number
  quotes: number
}

const MONTHS_2024: Omit<MonthSeed, "year">[] = [
  { month: 0, leads: 14, customers: 3, revenue: 18600, adSpend: 12800, qualified: 7, quotes: 4 },
  { month: 1, leads: 16, customers: 4, revenue: 21400, adSpend: 13000, qualified: 8, quotes: 5 },
  { month: 2, leads: 18, customers: 4, revenue: 24800, adSpend: 13200, qualified: 9, quotes: 5 },
  { month: 3, leads: 17, customers: 4, revenue: 23100, adSpend: 13600, qualified: 9, quotes: 5 },
  { month: 4, leads: 21, customers: 5, revenue: 29400, adSpend: 13800, qualified: 11, quotes: 7 },
  { month: 5, leads: 22, customers: 6, revenue: 32800, adSpend: 14000, qualified: 12, quotes: 7 },
  { month: 6, leads: 14, customers: 3, revenue: 16800, adSpend: 13400, qualified: 7, quotes: 4 },
  { month: 7, leads: 19, customers: 5, revenue: 28600, adSpend: 14100, qualified: 10, quotes: 6 },
  { month: 8, leads: 24, customers: 7, revenue: 41200, adSpend: 14400, qualified: 13, quotes: 8 },
  { month: 9, leads: 26, customers: 8, revenue: 44800, adSpend: 14800, qualified: 14, quotes: 9 },
  { month: 10, leads: 27, customers: 7, revenue: 42600, adSpend: 16800, qualified: 15, quotes: 9 },
  { month: 11, leads: 32, customers: 10, revenue: 56400, adSpend: 15400, qualified: 18, quotes: 12 },
]

const MONTHS_2025: Omit<MonthSeed, "year">[] = [
  { month: 0, leads: 22, customers: 5, revenue: 31200, adSpend: 16000, qualified: 12, quotes: 7 },
  { month: 1, leads: 24, customers: 6, revenue: 34800, adSpend: 16200, qualified: 13, quotes: 8 },
  { month: 2, leads: 28, customers: 7, revenue: 42100, adSpend: 16500, qualified: 15, quotes: 9 },
  { month: 3, leads: 26, customers: 6, revenue: 38600, adSpend: 17000, qualified: 14, quotes: 8 },
  { month: 4, leads: 31, customers: 8, revenue: 49200, adSpend: 17200, qualified: 17, quotes: 11 },
  { month: 5, leads: 33, customers: 9, revenue: 53800, adSpend: 17500, qualified: 18, quotes: 12 },
  { month: 6, leads: 21, customers: 4, revenue: 27400, adSpend: 16800, qualified: 10, quotes: 6 },
  { month: 7, leads: 29, customers: 8, revenue: 47600, adSpend: 17600, qualified: 16, quotes: 10 },
  { month: 8, leads: 36, customers: 11, revenue: 68400, adSpend: 18000, qualified: 21, quotes: 14 },
  { month: 9, leads: 39, customers: 12, revenue: 74200, adSpend: 18500, qualified: 22, quotes: 15 },
  { month: 10, leads: 41, customers: 11, revenue: 69800, adSpend: 21000, qualified: 23, quotes: 14 },
  { month: 11, leads: 48, customers: 15, revenue: 92600, adSpend: 19200, qualified: 28, quotes: 19 },
]

const MONTHS_2026: Omit<MonthSeed, "year">[] = [
  { month: 0, leads: 38, customers: 10, revenue: 68500, adSpend: 18500, qualified: 22, quotes: 14 },
  { month: 1, leads: 44, customers: 13, revenue: 81200, adSpend: 19000, qualified: 26, quotes: 17 },
  { month: 2, leads: 51, customers: 16, revenue: 97800, adSpend: 19500, qualified: 31, quotes: 21 },
  { month: 3, leads: 48, customers: 14, revenue: 89200, adSpend: 21000, qualified: 28, quotes: 18 },
  { month: 4, leads: 56, customers: 19, revenue: 118400, adSpend: 20500, qualified: 34, quotes: 24 },
  { month: 5, leads: 62, customers: 22, revenue: 136800, adSpend: 21000, qualified: 38, quotes: 27 },
  { month: 6, leads: 47, customers: 15, revenue: 94200, adSpend: 21500, qualified: 27, quotes: 19 },
  { month: 7, leads: 58, customers: 21, revenue: 128600, adSpend: 22000, qualified: 36, quotes: 26 },
  { month: 8, leads: 71, customers: 27, revenue: 168400, adSpend: 23000, qualified: 44, quotes: 33 },
  { month: 9, leads: 76, customers: 29, revenue: 184200, adSpend: 24000, qualified: 48, quotes: 36 },
  { month: 10, leads: 82, customers: 31, revenue: 201800, adSpend: 28000, qualified: 52, quotes: 38 },
  { month: 11, leads: 94, customers: 38, revenue: 248600, adSpend: 25500, qualified: 61, quotes: 46 },
]

function toBucket(seed: MonthSeed): PerformanceBucket {
  const start = startOfMonth(new Date(seed.year, seed.month, 1))
  const end = endOfMonth(start)
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
    leads: seed.leads,
    customers: seed.customers,
    revenue: seed.revenue,
    adSpend: seed.adSpend,
    qualified: seed.qualified,
    quotes: seed.quotes,
  }
}

export const MONTHLY_MOCK_DATA: PerformanceBucket[] = [
  ...MONTHS_2024.map((month) => toBucket({ ...month, year: 2024 })),
  ...MONTHS_2025.map((month) => toBucket({ ...month, year: 2025 })),
  ...MONTHS_2026.map((month) => toBucket({ ...month, year: 2026 })),
]

function distribute(total: number, parts: number, seed: number): number[] {
  if (parts <= 0) return []
  if (total === 0) return Array.from({ length: parts }, () => 0)

  const weights = Array.from({ length: parts }, (_, index) => {
    const wave = 0.75 + 0.35 * Math.sin((index + seed) * 0.7)
    return wave
  })
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const values = weights.map((weight) =>
    Math.floor((total * weight) / weightSum)
  )
  let remainder = total - values.reduce((sum, value) => sum + value, 0)
  let cursor = 0
  while (remainder > 0) {
    values[cursor % parts] += 1
    remainder -= 1
    cursor += 1
  }
  return values
}

function splitByWeights(total: number, weights: number[]): number[] {
  if (total === 0) return weights.map(() => 0)
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const raw = weights.map((weight) => (total * weight) / sum)
  const values = raw.map((value) => Math.floor(value))
  let remainder = total - values.reduce((acc, value) => acc + value, 0)
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction)

  for (const item of order) {
    if (remainder <= 0) break
    values[item.index] += 1
    remainder -= 1
  }

  return values
}

function splitMonthByService(bucket: PerformanceBucket): PerformanceBucket[] {
  const start = new Date(`${bucket.start}T00:00:00`)
  const weights = SERVICES.map((service) =>
    Math.max(0.04, serviceShare(service.id, start.getMonth(), start.getFullYear()))
  )

  const leads = splitByWeights(bucket.leads, weights)
  const customers = splitByWeights(bucket.customers, weights)
  const revenue = splitByWeights(bucket.revenue, weights)
  const adSpend = splitByWeights(bucket.adSpend, weights)
  const qualified = splitByWeights(bucket.qualified ?? 0, weights)
  const quotes = splitByWeights(bucket.quotes ?? 0, weights)

  return SERVICES.map((service, index) => {
    const share = Math.min(
      0.92,
      Math.max(0.08, b2bShare(service.id, start.getMonth()))
    )
    const [b2bCustomers, b2cCustomers] = splitByWeights(customers[index], [
      share,
      1 - share,
    ])

    return {
      ...bucket,
      service: service.id,
      leads: leads[index],
      customers: b2bCustomers + b2cCustomers,
      b2bCustomers,
      b2cCustomers,
      revenue: revenue[index],
      adSpend: adSpend[index],
      qualified: qualified[index],
      quotes: quotes[index],
    }
  })
}

function splitBucketByFunnel(bucket: PerformanceBucket): PerformanceBucket[] {
  const start = new Date(`${bucket.start}T00:00:00`)
  const volumeWeights = FUNNELS.map((funnel) =>
    Math.max(0.08, funnelVolumeShare(funnel.id, start.getMonth()))
  )
  const adWeights = FUNNELS.map((funnel) =>
    Math.max(0.04, funnelAdSpendShare(funnel.id, start.getMonth()))
  )

  const leads = splitByWeights(bucket.leads, volumeWeights)
  const b2bCustomers = splitByWeights(bucket.b2bCustomers ?? 0, volumeWeights)
  const b2cCustomers = splitByWeights(bucket.b2cCustomers ?? 0, volumeWeights)
  const revenue = splitByWeights(bucket.revenue, volumeWeights)
  const adSpend = splitByWeights(bucket.adSpend, adWeights)
  const qualified = splitByWeights(bucket.qualified ?? 0, volumeWeights)
  const quotes = splitByWeights(bucket.quotes ?? 0, volumeWeights)

  return FUNNELS.map((funnel, index) => ({
    ...bucket,
    funnel: funnel.id,
    leads: leads[index],
    customers: b2bCustomers[index] + b2cCustomers[index],
    b2bCustomers: b2bCustomers[index],
    b2cCustomers: b2cCustomers[index],
    revenue: revenue[index],
    adSpend: adSpend[index],
    qualified: qualified[index],
    quotes: quotes[index],
  }))
}

export function expandMonthToDays(bucket: PerformanceBucket): PerformanceBucket[] {
  const start = new Date(`${bucket.start}T00:00:00`)
  const end = new Date(`${bucket.end}T00:00:00`)
  const days = eachDayOfInterval({ start, end })
  const seed =
    start.getFullYear() * 12 +
    start.getMonth() +
    (bucket.service?.length ?? 0) +
    (bucket.funnel?.length ?? 0)

  const leads = distribute(bucket.leads, days.length, seed)
  const b2bCustomers = distribute(
    bucket.b2bCustomers ?? 0,
    days.length,
    seed + 3
  )
  const b2cCustomers = distribute(
    bucket.b2cCustomers ?? 0,
    days.length,
    seed + 5
  )
  const revenue = distribute(bucket.revenue, days.length, seed + 7)
  const adSpend = distribute(bucket.adSpend, days.length, seed + 11)
  const qualified = distribute(bucket.qualified ?? 0, days.length, seed + 13)
  const quotes = distribute(bucket.quotes ?? 0, days.length, seed + 17)

  return days.map((day, index) => ({
    start: toIsoDate(day),
    end: toIsoDate(day),
    leads: leads[index],
    customers: b2bCustomers[index] + b2cCustomers[index],
    b2bCustomers: b2bCustomers[index],
    b2cCustomers: b2cCustomers[index],
    revenue: revenue[index],
    adSpend: adSpend[index],
    qualified: qualified[index],
    quotes: quotes[index],
    service: bucket.service,
    funnel: bucket.funnel,
  }))
}

let dailyCache: PerformanceBucket[] | null = null

export function getDailyMockData(): PerformanceBucket[] {
  if (!dailyCache) {
    dailyCache = MONTHLY_MOCK_DATA.flatMap(splitMonthByService)
      .flatMap(splitBucketByFunnel)
      .flatMap(expandMonthToDays)
  }
  return dailyCache
}
