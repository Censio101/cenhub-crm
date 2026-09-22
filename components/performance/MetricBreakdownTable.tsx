import { cn } from "cn"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DANISH_MONTHS_SHORT,
  formatCurrencyDKK,
  formatInteger,
  formatPercentage,
} from "@/lib/performance/format"
import type {
  MetricDefinition,
  PerformanceBucket,
  PeriodTotals,
} from "@/lib/performance/types"

function formatCell(
  format: "currency" | "percent" | "integer",
  value: number | null
): string {
  if (value == null) return "–"
  if (format === "currency") return formatCurrencyDKK(value)
  if (format === "percent") return formatPercentage(value)
  return formatInteger(value)
}

function monthKey(bucket: PerformanceBucket): string {
  const date = new Date(`${bucket.start}T00:00:00`)
  return `${date.getFullYear()}-${date.getMonth()}`
}

const valueCellClass = "tabular-nums text-[var(--text-primary)]"

const headerCellClass =
  "h-11 border-b border-r border-white/15 bg-[#3f3a36] px-2 py-0 font-medium text-white"
const nameHeaderClass =
  "sticky left-0 z-30 w-40 min-w-40 bg-[#3f3a36] px-3 font-medium tracking-tight text-white"
const nameCellClass =
  "sticky left-0 z-20 w-40 min-w-40 border-b border-r border-[var(--table-grid)] bg-[var(--card-solid)] px-3 font-semibold tracking-tight text-[var(--text-primary)]"
const totalColumnBg =
  "metric-breakdown-total bg-[color-mix(in_srgb,var(--positive)_12%,#ffffff)]"
const totalHeaderClass = "border-l border-white/15 px-2.5"
const totalCellClass = `border-b border-l border-[var(--table-grid)] ${totalColumnBg} px-2.5`

export function MetricBreakdownTable({
  metrics,
  monthBuckets,
  totalTotals,
  showTotal = true,
}: {
  metrics: MetricDefinition[]
  monthBuckets: PerformanceBucket[]
  totalTotals?: PeriodTotals
  showTotal?: boolean
}) {
  const columns = monthBuckets.map((bucket) => {
    const date = new Date(`${bucket.start}T00:00:00`)
    return {
      key: monthKey(bucket),
      label: DANISH_MONTHS_SHORT[date.getMonth()],
      bucket,
    }
  })

  return (
    <Table className="metric-breakdown-table w-full border-separate border-spacing-0">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            className={cn(headerCellClass, nameHeaderClass, "text-left")}
          >
            Nøgletal
          </TableHead>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={cn(headerCellClass, "text-right")}
            >
              {column.label}
            </TableHead>
          ))}
          {showTotal ? (
            <TableHead
              className={cn(headerCellClass, totalHeaderClass, "text-right")}
            >
              Total
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((metric) => (
          <TableRow key={metric.id} className="hover:bg-transparent">
            <TableCell className={cn(nameCellClass, "py-3")}>
              {metric.label}
              {metric.explanation ? (
                <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
                  {metric.explanation}
                </span>
              ) : null}
            </TableCell>
            {columns.map((column) => {
              const value = metric.compute(column.bucket)
              return (
                <TableCell
                  key={column.key}
                  className={cn(
                    "border-b border-r border-[var(--table-grid)] px-2 py-3 text-right",
                    valueCellClass
                  )}
                >
                  {formatCell(metric.format, value)}
                </TableCell>
              )
            })}
            {showTotal && totalTotals ? (
              <TableCell
                className={cn(
                  totalCellClass,
                  "border-b py-3 text-right",
                  valueCellClass
                )}
              >
                {formatCell(metric.format, metric.compute(totalTotals))}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
