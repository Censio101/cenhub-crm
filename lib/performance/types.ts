import type { CustomerSegmentId } from "./customer-segments"
import type { FunnelId } from "./funnels"
import type { ServiceId } from "./services"

export type Granularity = "day" | "week" | "month"

export type PerformanceBucket = {
  start: string
  end: string
  leads: number
  customers: number
  b2bCustomers?: number
  b2cCustomers?: number
  revenue: number
  adSpend: number
  profit?: number | null
  qualified?: number
  quotes?: number
  service?: ServiceId
  funnel?: FunnelId
}

export type PeriodTotals = Omit<PerformanceBucket, "start" | "end">

export type MetricId =
  | "revenue"
  | "profit"
  | "cac"
  | "cpl"
  | "adSpend"
  | "closeRate"
  | "leads"
  | "customers"
  | "ltv"

export type MetricFormat = "currency" | "percent" | "integer"

export type PositiveDirection = "up" | "down" | "neutral"

export type MetricDefinition = {
  id: MetricId
  label: string
  description: string
  format: MetricFormat
  positiveDirection: PositiveDirection
  showInKpiGrid: boolean
  showInChart: boolean
  showInTable: boolean
  showInYearTotals?: boolean
  emphasizePositive?: boolean
  explanation?: string
  nullHint?: string
  compute: (totals: PeriodTotals) => number | null
}

export type DatePreset =
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_3_months"
  | "last_6_months"
  | "ytd"
  | "last_12_months"
  | "custom"

export type ComparisonMode = "previous_period" | "previous_year" | "custom"

export type DateRange = {
  start: Date
  end: Date
}

export type DashboardQuery = {
  range: DateRange
  comparison?: DateRange | null
  service?: ServiceId | null
  funnel?: FunnelId | null
  segment?: CustomerSegmentId | null
}

export type PeriodResult = {
  buckets: PerformanceBucket[]
  monthlyBuckets: PerformanceBucket[]
  totals: PeriodTotals
  label: string
}

export type DashboardStatus = "ok" | "empty" | "partial"

export type YearOverview = {
  year: number
  monthlyBuckets: PerformanceBucket[]
  cumulativeBuckets: PerformanceBucket[]
}

export type PerformanceDashboardData = {
  current: PeriodResult
  comparison: PeriodResult | null
  year: YearOverview
  status: DashboardStatus
  granularity: Granularity
}

export type MetricDelta = {
  absolute: number | null
  percent: number | null
  direction: "up" | "down" | "flat" | "unknown"
  isPositive: boolean | null
}

export type ChartPoint = {
  key: string
  label: string
  current: number | null
  comparison: number | null
  spend?: number | null
}
