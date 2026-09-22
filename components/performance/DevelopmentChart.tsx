"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartTooltip } from "@/components/performance/ChartTooltip"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { META_ADS_BLUE, META_ADS_SPEND_LABEL } from "@/lib/performance/funnels"
import { formatAxisValue } from "@/lib/performance/format"
import { getChartSeries } from "@/lib/performance/get-performance"
import { chartMetrics, getMetric } from "@/lib/performance/metrics"
import type { MetricId, PerformanceDashboardData } from "@/lib/performance/types"
import { cn } from "cn"

/** Light positive green — readable on the pale chart surface. */
const POSITIVE_SERIES_GREEN = "#4ade80"
/** Soft green wash under the series. */
const POSITIVE_SERIES_FILL = "#46C7A0"

function seriesColor(metricId: MetricId) {
  return metricId === "adSpend" ? META_ADS_BLUE : POSITIVE_SERIES_GREEN
}

export function DevelopmentChart({
  data,
  metricId,
  currentLabel,
  comparisonLabel,
  onMetricChange,
}: {
  data: PerformanceDashboardData
  metricId: MetricId
  currentLabel: string
  comparisonLabel: string | null
  onMetricChange: (metricId: MetricId) => void
}) {
  const metric = getMetric(metricId)
  const points = getChartSeries(data, metricId)
  const metrics = chartMetrics()
  const showSpend = metricId === "revenue"
  const revenueLabel = showSpend ? metric.label : currentLabel
  const showLegend = Boolean(comparisonLabel) || showSpend
  const currentColor = seriesColor(metricId)
  const fillColor = metricId === "adSpend" ? currentColor : POSITIVE_SERIES_FILL

  return (
    <Card className="dashboard-card dashboard-chart-card py-0">
      <CardHeader className="flex flex-col gap-4 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
            Udvikling
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Se hvordan jeres resultater udvikler sig over tid
          </p>
        </div>

        <div className="hidden flex-wrap justify-end gap-2 md:flex">
          {metrics.map((item) => {
            const selected = item.id === metricId
            return (
              <Button
                key={item.id}
                size="default"
                variant="ghost"
                onClick={() => onMetricChange(item.id)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-sm font-medium text-[var(--text-muted)]",
                  "hover:bg-[#dcfce7] hover:text-[#166534]",
                  selected &&
                    "bg-[#bbf7d0] text-[#166534] hover:bg-[#bbf7d0] hover:text-[#166534]"
                )}
              >
                {item.label}
              </Button>
            )
          })}
        </div>

        <Select
          value={metricId}
          onValueChange={(value) => {
            if (typeof value === "string") onMetricChange(value as MetricId)
          }}
        >
          <SelectTrigger className="dashboard-chip md:hidden" aria-label="Vælg nøgletal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dashboard-filter-menu">
            {metrics.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-3 pb-6 sm:px-6">
        <div className="h-[240px] w-full sm:h-[320px] lg:h-[380px]">
          <ResponsiveContainer
            key={`${metricId}-${points.length}-${points[0]?.current ?? 0}`}
            width="100%"
            height="100%"
          >
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fillColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={fillColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical
                horizontal
              />
              <XAxis
                dataKey="label"
                interval={0}
                minTickGap={0}
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
                width={72}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 12,
                  fontFamily: "var(--font-outfit), Outfit, sans-serif",
                }}
                tickFormatter={(value: number) =>
                  formatAxisValue(value, metric.format)
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as never}
                    metricId={metricId}
                    currentLabel={revenueLabel}
                    comparisonLabel={comparisonLabel}
                    spendLabel={showSpend ? META_ADS_SPEND_LABEL : null}
                  />
                )}
              />
              {showLegend ? (
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="plainline"
                  wrapperStyle={{
                    fontSize: 12,
                    paddingBottom: 8,
                    color: "var(--text-secondary)",
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="current"
                name={revenueLabel}
                stroke={currentColor}
                fill="url(#currentFill)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: currentColor, stroke: currentColor }}
                connectNulls={false}
              />
              {showSpend ? (
                <Line
                  type="monotone"
                  dataKey="spend"
                  name={META_ADS_SPEND_LABEL}
                  stroke={META_ADS_BLUE}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: META_ADS_BLUE }}
                  connectNulls={false}
                />
              ) : null}
              {comparisonLabel ? (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={comparisonLabel}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="5 5"
                  strokeWidth={1.75}
                  dot={false}
                  connectNulls={false}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
