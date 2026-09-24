"use client"

import { useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCustomers } from "@/hooks/useCustomers"
import {
  CUSTOMER_SOURCES,
  filterDashboardCustomers,
  formatCustomerServices,
  getCustomerSegmentLabel,
  getCustomerSourceLabel,
  sortCustomersByDate,
  sumCustomerValue,
  type Customer,
  type CustomerSourceId,
} from "@/lib/customers"
import { formatLeadMonth } from "@/lib/leads"
import { formatCurrencyDKK } from "@/lib/performance/format"
import { cn } from "cn"

function danishCount(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function formatClosedDate(value: string): string {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${Number(day)}. ${formatLeadMonth(`${year}-${month}`).toLowerCase()}`
}

export function CustomersBoard() {
  const { enabledServices } = useCompanyServices()
  const {
    view,
    onPresetChange,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
  } = useDashboardViewState("/kunder")
  const { customers, organizationName, error, needsClientSelection } =
    useCustomers()
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceId | "all">(
    "all"
  )
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc")

  const filtered = useMemo(() => {
    const next = filterDashboardCustomers(customers, {
      range: view.range,
      service: view.service,
      segment: view.segment,
    }).filter(
      (customer) =>
        sourceFilter === "all" || customer.source === sourceFilter
    )
    return sortCustomersByDate(next, dateSort)
  }, [customers, dateSort, sourceFilter, view])

  const totals = useMemo(() => sumCustomerValue(filtered), [filtered])

  if (needsClientSelection) {
    return <SelectClientEmptyState />
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-6">
      <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Kunder
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            Kundeliste
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizationName
              ? `Vundne sager hos ${organizationName}`
              : "Vundne sager fra leads med status Vundet"}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-muted-foreground" role="status">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:items-end">
          <DateRangeControls
            preset={view.preset}
            range={view.range}
            comparisonEnabled={view.comparisonEnabled}
            comparisonMode={view.comparisonMode}
            comparisonRange={view.comparisonRange}
            onPresetChange={onPresetChange}
            onCustomRange={onCustomRange}
            onComparisonChange={onComparisonChange}
            service={view.service}
            onServiceChange={onServiceChange}
            funnel={view.funnel}
            onFunnelChange={onFunnelChange}
            segment={view.segment}
            onSegmentChange={onSegmentChange}
            showComparison={false}
          />
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setSourceFilter(
                  value === "all" ? "all" : (value as CustomerSourceId)
                )
              }
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-40 self-end px-4"
              aria-label="Filtrer på kilde"
            >
              <SelectValue>
                {sourceFilter === "all"
                  ? "Alle kilder"
                  : getCustomerSourceLabel(sourceFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Alle kilder</SelectItem>
              {CUSTOMER_SOURCES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section aria-label="Kundeoverblik">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <OverviewStat
            label="Kunder"
            value={danishCount(totals.count, "kunde", "kunder")}
          />
          <OverviewStat
            label="Omsætning"
            value={formatCurrencyDKK(totals.sales)}
            tone="success"
          />
          <OverviewStat
            label="Bundlinje"
            value={formatCurrencyDKK(totals.profit)}
            tone="success"
          />
        </div>
      </section>

      <section className="dashboard-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <CustomersTable
            customers={filtered}
            dateSort={dateSort}
            enabledServices={enabledServices}
            onToggleDateSort={() =>
              setDateSort((current) => (current === "desc" ? "asc" : "desc"))
            }
          />
        </div>
      </section>
    </div>
  )
}

function OverviewStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success"
}) {
  return (
    <div className="dashboard-card px-5 py-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-[1.65rem] leading-none font-semibold tracking-tight tabular-nums",
          tone === "success" ? "text-success-foreground" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function CustomersTable({
  customers,
  dateSort,
  enabledServices,
  onToggleDateSort,
}: {
  customers: Customer[]
  dateSort: "asc" | "desc"
  enabledServices: ReturnType<typeof useCompanyServices>["enabledServices"]
  onToggleDateSort: () => void
}) {
  return (
    <Table
      containerClassName="overflow-visible"
      className="min-w-[76rem] border-separate border-spacing-0"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {[
            "Lukket",
            "Kunde",
            "Privat/Erhverv",
            "Virksomhed",
            "Adresse",
            "By",
            "Service",
            "Kilde",
            "Salgspris",
            "Bundlinje",
          ].map((label, index) => (
            <TableHead
              key={label}
              className={cn(
                "h-11 border-b border-r border-white/15 bg-[#3f3a36] px-2 text-xs font-medium text-white",
                index === 0 && "sticky left-0 z-[1] w-40 min-w-40",
                index === 1 &&
                  "sticky left-40 z-[1] min-w-48"
              )}
            >
              {index === 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-white hover:text-white/80"
                  aria-label={
                    dateSort === "desc"
                      ? "Sortér ældste først"
                      : "Sortér nyeste først"
                  }
                  onClick={onToggleDateSort}
                >
                  {label}
                  {dateSort === "desc" ? (
                    <ArrowDownIcon className="size-3.5" />
                  ) : (
                    <ArrowUpIcon className="size-3.5" />
                  )}
                </button>
              ) : (
                label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={10}
              className="px-4 py-10 text-center text-sm text-muted-foreground"
            >
              Ingen kunder matcher filtrene.
            </TableCell>
          </TableRow>
        ) : (
          customers.map((customer) => (
            <TableRow key={customer.id} className="hover:bg-transparent">
              <TableCell className="sticky left-0 z-[1] w-40 min-w-40 bg-card px-3">
                {formatClosedDate(customer.closedDate)}
              </TableCell>
              <TableCell className="sticky left-40 z-[1] min-w-48 border-r border-border bg-card px-3">
                <div className="min-w-0">
                  <p className="font-medium">{customer.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.email} · {customer.phone}
                  </p>
                </div>
              </TableCell>
              <TableCell className="px-3">
                {getCustomerSegmentLabel(customer.segment)}
              </TableCell>
              <TableCell className="min-w-44 px-3">
                {customer.companyName || "–"}
              </TableCell>
              <TableCell className="min-w-48 px-3">
                {customer.address}, {customer.zipCode}
              </TableCell>
              <TableCell className="min-w-32 px-3">{customer.city}</TableCell>
              <TableCell className="min-w-44 px-3">
                {formatCustomerServices(customer, enabledServices)}
              </TableCell>
              <TableCell className="px-3">
                {getCustomerSourceLabel(customer.source)}
              </TableCell>
              <TableCell className="px-3 text-right tabular-nums">
                {formatCurrencyDKK(customer.salesPrice)}
              </TableCell>
              <TableCell className="px-3 text-right font-medium tabular-nums text-success-foreground">
                {formatCurrencyDKK(customer.profit)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
