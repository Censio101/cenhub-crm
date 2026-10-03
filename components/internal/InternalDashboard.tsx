"use client"

import { useEffect, useMemo, useState } from "react"
import { da } from "date-fns/locale"
import { CalendarIcon, HeadsetIcon, ServerIcon, TrendingUpIcon, UsersIcon, WalletIcon } from "lucide-react"

import {
  InternalCustomerLeaderboard,
  type LeaderboardCustomer,
} from "@/components/internal/InternalCustomerLeaderboard"
import { InternalPipelineCustomers } from "@/components/internal/InternalPipelineCustomers"
import { InternalKpiCard } from "@/components/internal/InternalKpiCard"
import { InternalMonthSheet } from "@/components/internal/InternalMonthSheet"
import { InternalRevenueChart, type ChartMetricId } from "@/components/internal/InternalRevenueChart"
import { loadInternalOverview } from "@/components/internal/overview"
import { DashboardCustomerSelect } from "@/components/internal/DashboardCustomerSelect"
import { ServiceSelect } from "@/components/internal/ServiceSelect"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  monthRevenue,
  serviceCashflow,
  spentToDate,
  type InternalOverview,
} from "@/lib/internal/metrics"
import { GoogleMark, MetaMark, SearchGlass } from "@/lib/internal/service-icons"
import {
  CENSIO_SERVICES,
  lineMatchesService,
  type ServiceId,
} from "@/lib/internal/services"
import { expenseMonthTotal } from "@/lib/internal/expenses"
import type { CommercialLine, FixedExpense } from "@/lib/onboarding/types"
import { formatCurrencyDKK, formatDateRangeLabel, formatSignedCurrency } from "@/lib/performance/format"

function monthsTouching(year: number, from: string, to: string) {
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  if (to < yearStart || from > yearEnd) return []
  const start = from < yearStart ? 0 : Number(from.slice(5, 7)) - 1
  const end = to > yearEnd ? 11 : Number(to.slice(5, 7)) - 1
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function sumMonths(series: number[] | null | undefined, months: number[]) {
  return months.reduce((sum, month) => sum + (series?.[month] ?? 0), 0)
}

function seriesFor(lines: CommercialLine[], year: number) {
  return Array.from({ length: 12 }, (_, monthIndex) => monthRevenue(lines, year, monthIndex))
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function revenueAmount(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number(digits) : null
}

function customerInSelection(
  lines: CommercialLine[],
  services: ServiceId[],
  today: string,
  from: string,
  to: string
) {
  const counted =
    services.length === 0 ? lines : lines.filter((line) => services.some((id) => lineMatchesService(line, id)))
  if (services.length > 0 && counted.length === 0) return false
  const spent = spentToDate(counted, today)
  const min = revenueAmount(from)
  const max = revenueAmount(to)
  if (min != null && spent < min) return false
  if (max != null && spent > max) return false
  return true
}

function activeMonthly(line: CommercialLine, today: string) {
  return line.cadence === "monthly" && line.startsOn <= today && (!line.endsOn || line.endsOn >= today)
}

export function InternalDashboard() {
  const [overview, setOverview] = useState<InternalOverview | null>(null)
  const [year] = useState<number | null>(null)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [compareFrom] = useState("")
  const [compareTo] = useState("")
  const [services, setServices] = useState<ServiceId[]>([])
  const [customerIds, setCustomerIds] = useState<string[]>([])
  const [revenueFrom] = useState("")
  const [revenueTo] = useState("")
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [showExpenses, setShowExpenses] = useState(false)
  const [chartMetric, setChartMetric] = useState<ChartMetricId>("revenue")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadInternalOverview(year ?? undefined)
      .then((payload) => {
        if (!active) return
        setOverview(payload)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Kunne ikke hente overblikket.")
      })
    return () => {
      active = false
    }
  }, [year])

  useEffect(() => {
    if (!overview) return
    const start = `${overview.year}-01-01`
    const end = overview.today.startsWith(String(overview.year))
      ? overview.today
      : `${overview.year}-12-31`
    setFrom(start)
    setTo(end)
  }, [overview])

  useEffect(() => {
    let active = true
    fetch("/api/admin/expenses")
      .then(async (response) => {
        const payload = (await response.json()) as { lines?: FixedExpense[] }
        if (!response.ok) return []
        return payload.lines ?? []
      })
      .then((lines) => {
        if (active) setExpenses(lines)
      })
      .catch(() => {
        if (active) setExpenses([])
      })
    return () => {
      active = false
    }
  }, [])

  const view = useMemo(() => {
    if (!overview) return null
    const customerAllowed = (workspaceId: string) =>
      customerIds.length === 0 || customerIds.includes(workspaceId)
    const matchesServices = (line: CommercialLine) =>
      services.length === 0 || services.some((id) => lineMatchesService(line, id))
    const inBand = (lines: CommercialLine[]) =>
      customerInSelection(lines, services, overview.today, revenueFrom, revenueTo)
    const selectedLines = overview.customers
      .filter((customer) => customerAllowed(customer.workspaceId) && inBand(customer.lines))
      .flatMap((customer) => customer.lines)
      .filter(matchesServices)
    const mrr = selectedLines
      .filter((line) => activeMonthly(line, overview.today))
      .reduce((total, line) => total + line.amount, 0)
    const revenue = seriesFor(selectedLines, overview.year)
    const comparison = seriesFor(selectedLines, overview.year - 1)
    const pendingRevenue = overview.pendingCustomers.reduce((sum, customer) => {
      if (!customerAllowed(customer.workspaceId) || !inBand(customer.lines)) return sum
      return (
        sum +
        customer.lines
          .filter((line) => matchesServices(line) && activeMonthly(line, overview.today))
          .reduce((total, line) => total + line.amount, 0)
      )
    }, 0)
    return { mrr, revenue, comparison, pendingRevenue, selectedLines }
  }, [overview, revenueFrom, revenueTo, services, customerIds])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!overview || !view) {
    return <p className="text-sm text-[var(--text-secondary)]">Henter overblik…</p>
  }

  const rangeFrom = from || `${overview.year}-01-01`
  const rangeTo = to && to >= rangeFrom ? to : rangeFrom
  const rangeLabel = formatDateRangeLabel(new Date(`${rangeFrom}T00:00:00`), new Date(`${rangeTo}T00:00:00`))
  const revenueBetween = (start: string, end: string) => {
    const startYear = Number(start.slice(0, 4))
    const endYear = Number(end.slice(0, 4))
    let total = 0
    for (let year = startYear; year <= endYear; year += 1) {
      const series = year === overview.year ? view.revenue : seriesFor(view.selectedLines, year)
      total += sumMonths(series, monthsTouching(year, start, end))
    }
    return total
  }
  const periodRevenue = revenueBetween(rangeFrom, rangeTo)
  const compareReady = Boolean(compareFrom && compareTo && compareFrom <= compareTo)
  const comparisonRevenue = compareReady ? revenueBetween(compareFrom, compareTo) : null
  const revenueChange = comparisonRevenue == null ? null : periodRevenue - comparisonRevenue
  const compareLabel = compareReady
    ? formatDateRangeLabel(new Date(`${compareFrom}T00:00:00`), new Date(`${compareTo}T00:00:00`))
    : ""
  const cash = serviceCashflow(
    view.selectedLines,
    overview.year,
    rangeTo < overview.today ? rangeTo : overview.today
  )
  const scopedLines = view.selectedLines
  const serviceRow = (id: ServiceId, label: string) => {
    const item = CENSIO_SERVICES.find((serviceItem) => serviceItem.id === id)
    return {
      label,
      icon: item?.icon,
      color: item?.color,
      values: seriesFor(
        scopedLines.filter((line) => lineMatchesService(line, id)),
        overview.year
      ),
    }
  }
  const show = (id: ServiceId) => services.length === 0 || services.includes(id)
  const monthRows = [
    { label: "Omsætning", values: view.revenue },
    {
      label: "MRR",
      values: seriesFor(
        scopedLines.filter((line) => line.cadence === "monthly"),
        overview.year
      ),
    },
    ...(show("meta") ? [serviceRow("meta", "Meta ads")] : []),
    ...(show("google") ? [serviceRow("google", "Google Ads")] : []),
    ...(show("video") ? [serviceRow("video", "Video")] : []),
    ...(show("seo") || show("geo")
      ? [
          {
            label: "SEO & GEO",
            icon: SearchGlass,
            color: "#E4660C",
            values: seriesFor(
              scopedLines.filter(
                (line) => lineMatchesService(line, "seo") || lineMatchesService(line, "geo")
              ),
              overview.year
            ),
          },
        ]
      : []),
    ...(show("hjemmeside") ? [serviceRow("hjemmeside", "Hjemmeside")] : []),
    ...(show("webshop") ? [serviceRow("webshop", "Webshop")] : []),
    ...(show("hosting") ? [serviceRow("hosting", "Hosting")] : []),
    ...(show("support") ? [serviceRow("support", "Support pakke")] : []),
  ]
  const chartSeries = (id: ChartMetricId, chartYear: number) => {
    if (id === "revenue") {
      return chartYear === overview.year ? view.revenue : seriesFor(scopedLines, chartYear)
    }
    const lines = scopedLines.filter((line) => {
      if (id === "seoGeo") return lineMatchesService(line, "seo") || lineMatchesService(line, "geo")
      if (id === "meta" || id === "google" || id === "hosting" || id === "support" || id === "video") {
        return lineMatchesService(line, id)
      }
      return false
    })
    return seriesFor(lines, chartYear)
  }
  const comparisonMonthValue = (monthIndex: number) => {
    if (!compareReady) return undefined
    const startYear = Number(compareFrom.slice(0, 4))
    const endYear = Number(compareTo.slice(0, 4))
    let value: number | undefined
    for (let year = startYear; year <= endYear; year += 1) {
      if (!monthsTouching(year, compareFrom, compareTo).includes(monthIndex)) continue
      value = chartSeries(chartMetric, year)[monthIndex] ?? 0
    }
    return value
  }
  const chartPoints = overview.months.map((month, index) => ({
    label: month.label,
    value: chartSeries(chartMetric, overview.year)[index] ?? 0,
    expenses: expenseMonthTotal(expenses, overview.year, index),
    comparison: compareReady ? comparisonMonthValue(index) : undefined,
  }))
  const customerAllowed = (workspaceId: string) =>
    customerIds.length === 0 || customerIds.includes(workspaceId)
  const topCustomers: LeaderboardCustomer[] = overview.customers
    .filter(
      (customer) =>
        customerAllowed(customer.workspaceId) &&
        customerInSelection(customer.lines, services, overview.today, revenueFrom, revenueTo)
    )
    .map((customer) => {
      const scopedLines = customer.lines.filter(
        (line) => services.length === 0 || services.some((id) => lineMatchesService(line, id))
      )
      return {
        workspaceId: customer.workspaceId,
        name: customer.name,
        lines: scopedLines,
        mrr: scopedLines
          .filter((line) => activeMonthly(line, overview.today))
          .reduce((sum, line) => sum + line.amount, 0),
        spent: spentToDate(scopedLines, overview.today),
      }
    })
    .filter((customer) => customer.spent > 0)
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name, "da"))
    .slice(0, 5)
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 sm:gap-8">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-full text-3xl font-medium tracking-tight text-balance text-[var(--text-primary)] sm:text-4xl">
            {rangeLabel}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Omsætning for {rangeLabel}
            {revenueChange == null
              ? ""
              : ` · ${revenueChange > 0 ? "Fremgang" : revenueChange < 0 ? "Nedgang" : "Uændret"} ${formatSignedCurrency(revenueChange)} mod ${compareLabel}`}
          </p>
        </div>
        <div className="flex max-w-full shrink-0 flex-wrap items-end justify-end gap-3">
          <DashboardCustomerSelect
            customers={overview.customers}
            value={customerIds}
            onChange={setCustomerIds}
            className="dashboard-chip w-[12.5rem] max-w-full justify-between"
          />
          <ServiceSelect
            label="Abonnementstype"
            value={services}
            onChange={setServices}
            className="dashboard-chip w-[12.5rem] max-w-full justify-between"
          />
          <div className="grid gap-1.5 text-sm whitespace-nowrap text-[var(--text-secondary)]">
            <span>Periode</span>
            <Popover>
              <PopoverTrigger
                className="dashboard-chip inline-flex w-[16rem] max-w-full items-center justify-start gap-2 px-4 text-left"
                aria-label="Periode"
              >
                <CalendarIcon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{rangeLabel}</span>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-2">
                <Calendar
                  mode="range"
                  locale={da}
                  captionLayout="dropdown"
                  startMonth={new Date(Math.min(...overview.years), 0, 1)}
                  endMonth={new Date(Math.max(...overview.years), 11, 31)}
                  labels={{
                    labelMonthDropdown: () => "Vælg måned",
                    labelYearDropdown: () => "Vælg år",
                  }}
                  selected={{
                    from: new Date(`${rangeFrom}T00:00:00`),
                    to: new Date(`${rangeTo}T00:00:00`),
                  }}
                  defaultMonth={new Date(`${rangeFrom}T00:00:00`)}
                  onSelect={(next) => {
                    if (!next?.from || !next.to) return
                    const start = toIso(next.from)
                    const end = toIso(next.to)
                    setFrom(start)
                    setTo(end < start ? start : end)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
      <section aria-label="Nøgletal">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <InternalKpiCard
            dense
            label="Omsætning"
            value={formatCurrencyDKK(periodRevenue)}
            icon={TrendingUpIcon}
            change={revenueChange == null ? undefined : `${formatSignedCurrency(revenueChange)} mod ${compareLabel}`}
            changeUp={revenueChange == null ? undefined : revenueChange >= 0}
          />
          <InternalKpiCard dense label="Abonnement cashflow" value={formatCurrencyDKK(cash.subscription)} icon={WalletIcon} />
          {show("meta") ? (
            <InternalKpiCard dense label="Meta ads" value={formatCurrencyDKK(cash.meta)} icon={MetaMark} color="#1877F2" />
          ) : null}
          {show("google") ? (
            <InternalKpiCard dense label="Google Ads" value={formatCurrencyDKK(cash.google)} icon={GoogleMark} color="#F5B400" />
          ) : null}
          {show("seo") || show("geo") ? (
            <InternalKpiCard dense label="SEO & GEO" value={formatCurrencyDKK(cash.seoGeo)} icon={SearchGlass} color="#E4660C" />
          ) : null}
          {show("hosting") ? (
            <InternalKpiCard dense label="Hosting" value={formatCurrencyDKK(cash.hosting)} icon={ServerIcon} color="#0F2744" />
          ) : null}
          {show("support") ? (
            <InternalKpiCard dense label="Support pakke" value={formatCurrencyDKK(cash.support)} icon={HeadsetIcon} color="#64748B" />
          ) : null}
          <InternalKpiCard dense label="Antal Marketing kunder" value={String(cash.marketingCustomers)} icon={UsersIcon} />
        </div>
      </section>
      <InternalRevenueChart
        year={overview.year}
        points={chartPoints}
        compare={compareReady}
        compareLabel={compareLabel}
        metric={chartMetric}
        onMetric={setChartMetric}
        showExpenses={showExpenses}
        onShowExpenses={setShowExpenses}
      />
      <InternalMonthSheet
        title={`Månedsopdeling ${overview.year}`}
        description="Omsætning, abonnementer og hver service pr. måned"
        months={overview.months}
        rows={monthRows}
      />
      <InternalMonthSheet
        title={`Akkumuleret ${overview.year}`}
        description="Hver måned lægges oven i de foregående, så totalen vokser gennem året"
        months={overview.months}
        running
        rows={monthRows.map((row) => {
          let sum = 0
          return {
            ...row,
            values: row.values.map((value) => {
              sum += value
              return sum
            }),
          }
        })}
      />
      <Card className="dashboard-card dashboard-monthly-card min-w-0 max-w-full gap-0 overflow-hidden border-[#E4660C]/20 py-0">
        <CardHeader className="rounded-none border-b border-[#E4660C]/15 bg-gradient-to-r from-[#E4660C]/10 via-white to-white px-4 py-5 sm:px-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Afventer opstart
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Forventet MRR, services og værdi — indtil kunden er i gang tæller omsætningen som pipeline (
            {formatCurrencyDKK(view.pendingRevenue)} / md.)
          </p>
        </CardHeader>
        <CardContent className="px-3 pb-5 pt-4 sm:px-4">
          <InternalPipelineCustomers
            compact
            customers={overview.pendingCustomers.filter(
              (customer) =>
                customerAllowed(customer.workspaceId) &&
                customerInSelection(customer.lines, services, overview.today, revenueFrom, revenueTo)
            )}
          />
        </CardContent>
      </Card>
      <Card className="dashboard-card dashboard-monthly-card min-w-0 max-w-full gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-none border-b border-border/60 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Top 5 kunder</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Omsætning · grøn streg = andel af #1
            {topCustomers[0] ? (
              <>
                {" "}
                · <span className="font-medium text-[#1f8a62]">{topCustomers[0].name}</span>
              </>
            ) : null}
          </p>
        </CardHeader>
        <CardContent className="px-3 py-1 sm:px-4">
          <div className="mb-1 hidden grid-cols-[1.75rem_minmax(0,1fr)_auto_auto_minmax(5rem,1.2fr)] gap-x-3 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)] sm:grid">
            <span aria-hidden />
            <span>Kunde</span>
            <span className="text-right">MRR</span>
            <span className="text-right">Omsætning</span>
            <span aria-hidden />
          </div>
          <InternalCustomerLeaderboard customers={topCustomers} />
        </CardContent>
      </Card>
    </div>
  )
}
