import { cn } from "cn"

import type { ServiceIcon } from "@/lib/internal/services"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrencyDKK } from "@/lib/performance/format"

const headerCellClass =
  "h-11 border-b border-r border-white/15 bg-[#3f3a36] px-2 py-0 font-medium text-white"
const nameHeaderClass =
  "sticky left-0 z-30 w-32 min-w-32 bg-[#3f3a36] px-2 font-medium tracking-tight text-white sm:w-48 sm:min-w-48 sm:px-3"
const nameCellClass =
  "sticky left-0 z-20 w-32 min-w-32 border-b border-r border-[var(--table-grid)] bg-[var(--card-solid)] px-2 font-semibold tracking-tight text-[var(--text-primary)] sm:w-48 sm:min-w-48 sm:px-3"
const valueCellClass = "tabular-nums text-[var(--text-primary)]"
const totalColumnBg =
  "metric-breakdown-total bg-[color-mix(in_srgb,var(--positive)_12%,#ffffff)]"

export function InternalMonthSheet({
  title,
  description,
  months,
  rows,
  running = false,
}: {
  title: string
  description: string
  running?: boolean
  months: { label: string }[]
  rows: {
    label: string
    values: number[]
    icon?: ServiceIcon
    color?: string
    marks?: { icon: ServiceIcon; color: string }[]
  }[]
}) {
  return (
    <Card className="dashboard-card dashboard-monthly-card min-w-0 max-w-full gap-0 overflow-hidden py-0">
      <CardHeader className="rounded-none px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table className="metric-breakdown-table w-full border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headerCellClass, nameHeaderClass, "text-left")}>
                Nøgletal
              </TableHead>
              {months.map((month) => (
                <TableHead
                  key={month.label}
                  className={cn(headerCellClass, "text-right")}
                >
                  {month.label}
                </TableHead>
              ))}
              <TableHead
                className={cn(headerCellClass, "border-l border-white/15 px-2.5 text-right")}
              >
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const total = row.values.reduce((sum, value) => sum + value, 0)
              const shownTotal = running || row.label === "Akkumuleret" ? row.values.at(-1) ?? 0 : total
              return (
                <TableRow key={row.label} className="hover:bg-transparent">
                  <TableCell className={cn(nameCellClass, "py-3")}>
                    <span className="inline-flex items-center gap-2">
                      {row.marks?.map((mark) => (
                        <mark.icon
                          key={mark.color}
                          className="size-4 shrink-0"
                          style={{ color: mark.color }}
                          aria-hidden
                        />
                      ))}
                      {!row.marks?.length && row.icon ? (
                        <row.icon
                          className="size-4 shrink-0"
                          style={{ color: row.color }}
                          aria-hidden
                        />
                      ) : null}
                      {row.label}
                    </span>
                  </TableCell>
                  {row.values.map((value, index) => (
                    <TableCell
                      key={`${row.label}-${months[index]?.label ?? index}`}
                      className={cn(
                        "border-b border-r border-[var(--table-grid)] px-2 py-3 text-right",
                        valueCellClass
                      )}
                    >
                      {formatCurrencyDKK(value)}
                    </TableCell>
                  ))}
                  <TableCell
                    className={cn(
                      "border-b border-l border-[var(--table-grid)] px-2.5 py-3 text-right",
                      totalColumnBg,
                      valueCellClass
                    )}
                  >
                    {formatCurrencyDKK(shownTotal)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
