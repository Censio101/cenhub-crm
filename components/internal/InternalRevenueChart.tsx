"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatAxisValue, formatCurrencyDKK } from "@/lib/performance/format"

const SERIES = "#46C7A0"
const EXPENSE = "#1877F2"

export const CHART_METRICS = [
  { id: "revenue", label: "Omsætning", color: "#46C7A0" },
  { id: "meta", label: "Meta ads", color: "#1877F2" },
  { id: "google", label: "Google Ads", color: "#F5B400" },
  { id: "seoGeo", label: "SEO & GEO", color: "#E4660C" },
  { id: "hosting", label: "Hosting", color: "#0F2744" },
  { id: "support", label: "Support pakke", color: "#64748B" },
  { id: "video", label: "Video", color: "#7C3AED" },
] as const

export type ChartMetricId = (typeof CHART_METRICS)[number]["id"]

export function InternalRevenueChart({
  year,
  points,
  compare,
  compareLabel,
  metric,
  onMetric,
  showExpenses,
  onShowExpenses,
}: {
  year: number
  points: { label: string; value: number; expenses?: number; comparison?: number }[]
  compare: boolean
  compareLabel?: string
  metric: ChartMetricId
  onMetric: (value: ChartMetricId) => void
  showExpenses: boolean
  onShowExpenses: (value: boolean) => void
}) {
  const selected = CHART_METRICS.find((item) => item.id === metric) ?? CHART_METRICS[0]
  return (
    <Card className="dashboard-card dashboard-chart-card min-w-0 max-w-full overflow-hidden py-0">
      <CardHeader className="gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
              Udvikling
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {showExpenses
                ? `${selected.label} og omkostninger i ${year}`
                : `${selected.label} i ${year}`}
            </p>
          </div>
          <button
            type="button"
            className={`shrink-0 text-sm ${showExpenses ? "font-medium text-[#141414]" : "text-[var(--text-secondary)]"}`}
            aria-pressed={showExpenses}
            onClick={() => onShowExpenses(!showExpenses)}
          >
            Omkostninger
          </button>
        </div>
        <div
          className="flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Serie i grafen"
        >
          {CHART_METRICS.map((item) => {
            const active = metric === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${
                  active
                    ? "font-medium text-[#141414]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[#141414]"
                }`}
                style={active ? { borderColor: SERIES } : undefined}
                onClick={() => onMetric(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-6 sm:px-6">
        <div className="h-[240px] w-full sm:h-[320px] lg:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="internalRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SERIES} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="internalExpenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EXPENSE} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={EXPENSE} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical horizontal />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                tickSize={6}
                tickMargin={8}
                padding={{ left: 8, right: 8 }}
                tickLine={{ stroke: "var(--border)" }}
                axisLine={{ stroke: "var(--border)" }}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 12,
                  fontFamily: "var(--font-outfit), Outfit, sans-serif",
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={88}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 12,
                  fontFamily: "var(--font-outfit), Outfit, sans-serif",
                }}
                tickFormatter={(value: number) => formatAxisValue(value, "currency")}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                formatter={(value) => formatCurrencyDKK(Number(value))}
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="value"
                name={selected.label}
                stroke={SERIES}
                fill="url(#internalRevenueFill)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: SERIES, stroke: SERIES }}
              />
              {showExpenses ? (
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Omkostninger"
                  stroke={EXPENSE}
                  fill="url(#internalExpenseFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: EXPENSE, stroke: EXPENSE }}
                />
              ) : null}
              {compare ? (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={compareLabel || String(year - 1)}
                  stroke="var(--text-muted)"
                  strokeDasharray="5 5"
                  strokeWidth={1.75}
                  dot={false}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
