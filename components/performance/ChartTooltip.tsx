"use client"

import {
  formatCurrencyDKK,
  formatInteger,
  formatPercentage,
  formatSignedCurrency,
  formatSignedPercentage,
} from "@/lib/performance/format"
import { META_ADS_BLUE } from "@/lib/performance/funnels"
import { computeDelta, getMetric } from "@/lib/performance/metrics"
import type { ChartPoint, MetricId } from "@/lib/performance/types"

function formatValue(metricId: MetricId, value: number | null): string {
  const metric = getMetric(metricId)
  if (value == null) return "–"
  if (metric.format === "currency") return formatCurrencyDKK(value)
  if (metric.format === "percent") return formatPercentage(value)
  return formatInteger(value)
}

function formatAbsolute(metricId: MetricId, value: number | null): string {
  const metric = getMetric(metricId)
  if (value == null) return "–"
  if (metric.format === "currency") return formatSignedCurrency(value)
  if (metric.format === "percent") return formatSignedPercentage(value)
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatInteger(value)}`
}

export function ChartTooltip({
  active,
  payload,
  metricId,
  currentLabel,
  comparisonLabel,
  spendLabel,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
  metricId: MetricId
  currentLabel: string
  comparisonLabel: string | null
  spendLabel?: string | null
}) {
  if (!active || !payload?.[0]) return null

  const point = payload[0].payload
  const metric = getMetric(metricId)
  const delta = comparisonLabel
    ? computeDelta(point.current, point.comparison, metric.positiveDirection)
    : null

  return (
    <div className="min-w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-solid)] px-3 py-2.5 text-[var(--text-primary)] shadow-none">
      <p className="text-xs font-medium text-[var(--text-muted)]">{point.label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        <span className={metric.emphasizePositive ? "text-[var(--positive)]" : undefined}>
          {currentLabel}: {formatValue(metricId, point.current)}
        </span>
      </p>
      {spendLabel ? (
        <p className="text-sm tabular-nums" style={{ color: META_ADS_BLUE }}>
          {spendLabel}: {formatValue("adSpend", point.spend ?? null)}
        </p>
      ) : null}
      {comparisonLabel ? (
        <>
          <p className="text-sm text-[var(--text-secondary)] tabular-nums">
            {comparisonLabel}: {formatValue(metricId, point.comparison)}
          </p>
          {delta && delta.direction !== "unknown" ? (
            <p className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
              {formatAbsolute(metricId, delta.absolute)}
              {delta.percent != null
                ? ` · ${formatSignedPercentage(delta.percent)}`
                : ""}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
