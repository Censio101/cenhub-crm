"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  CalendarIcon,
  WrenchIcon,
} from "lucide-react"

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
import {
  CUSTOMER_SOURCES,
  MOCK_CUSTOMERS,
  customerMonthKey,
  formatCustomerServices,
  getCustomerSegmentLabel,
  getCustomerSourceLabel,
  sortCustomersByDate,
  sumCustomerValue,
  type Customer,
  type CustomerSourceId,
} from "@/lib/customers"
import { LEAD_SEGMENTS, formatLeadMonth, type LeadSegmentId } from "@/lib/leads"
import { formatCurrencyDKK } from "@/lib/performance/format"
import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
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
  const [segmentFilter, setSegmentFilter] = useState<LeadSegmentId | "all">(
    "all"
  )
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all")
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceId | "all">(
    "all"
  )
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc")

  const months = useMemo(() => {
    const keys = new Set(
      MOCK_CUSTOMERS.map((customer) => customerMonthKey(customer.closedDate))
    )
    return [...keys].sort((left, right) => right.localeCompare(left))
  }, [])

  const activeServiceFilter =
    serviceFilter !== "all" &&
    enabledServices.some((item) => item.id === serviceFilter)
      ? serviceFilter
      : "all"

  const filtered = useMemo(() => {
    const next = MOCK_CUSTOMERS.filter((customer) => {
      const matchesSegment =
        segmentFilter === "all" || customer.segment === segmentFilter
      const matchesService =
        activeServiceFilter === "all" ||
        customer.serviceIds.includes(activeServiceFilter)
      const matchesSource =
        sourceFilter === "all" || customer.source === sourceFilter
      const matchesMonth =
        monthFilter === "all" ||
        customerMonthKey(customer.closedDate) === monthFilter
      return matchesSegment && matchesService && matchesSource && matchesMonth
    })
    return sortCustomersByDate(next, dateSort)
  }, [activeServiceFilter, dateSort, monthFilter, segmentFilter, sourceFilter])

  const totals = useMemo(() => sumCustomerValue(filtered), [filtered])

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
            Vundne sager hos Nordkystens Tømrer — Helsingør og Nordsjælland
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={monthFilter}
            onValueChange={(value) => {
              if (typeof value === "string") setMonthFilter(value)
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-48 px-4"
              aria-label="Filtrer på måned"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              <SelectValue>
                {monthFilter === "all"
                  ? "Alle måneder"
                  : formatLeadMonth(monthFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Alle måneder</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatLeadMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeServiceFilter}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setServiceFilter(value === "all" ? "all" : value)
              }
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-44 px-4"
              aria-label="Filtrer på service"
            >
              <WrenchIcon className="size-4 text-muted-foreground" />
              <SelectValue>
                {activeServiceFilter === "all"
                  ? "Alle services"
                  : enabledServices.find((item) => item.id === activeServiceFilter)
                      ?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Alle services</SelectItem>
              {enabledServices.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={segmentFilter}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setSegmentFilter(
                  value === "all" ? "all" : (value as LeadSegmentId)
                )
              }
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-40 px-4"
              aria-label="Filtrer på Privat eller Erhverv"
            >
              <Building2Icon className="size-4 text-muted-foreground" />
              <SelectValue>
                {segmentFilter === "all"
                  ? "Privat & Erhverv"
                  : getCustomerSegmentLabel(segmentFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Privat & Erhverv</SelectItem>
              {LEAD_SEGMENTS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              className="dashboard-chip min-w-40 px-4"
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
  onToggleDateSort,
}: {
  customers: Customer[]
  dateSort: "asc" | "desc"
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
