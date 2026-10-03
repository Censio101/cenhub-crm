"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { endOfYear, startOfYear } from "date-fns"
import { Building2Icon, ChevronDownIcon, HandshakeIcon, ReceiptIcon, SparklesIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { onboardingFieldClass } from "@/components/onboarding/field"
import { MetaMark } from "@/lib/internal/service-icons"
import { ExpenseCompareRangePicker } from "@/components/internal/ExpenseCompareRangePicker"
import { ExpenseDateField } from "@/components/internal/ExpenseDateField"
import { ExpenseOptionalDateField } from "@/components/internal/ExpenseOptionalDateField"
import { ExpensePricePeriodsEditor } from "@/components/internal/ExpensePricePeriodsEditor"
import { ExpenseDateRangePicker } from "@/components/internal/ExpenseDateRangePicker"
import { InternalKpiCard } from "@/components/internal/InternalKpiCard"
import { InternalMonthSheet } from "@/components/internal/InternalMonthSheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  EXPENSE_TYPES,
  expenseCurrentAmount,
  expenseMonthOverlapsRange,
  expenseMonthTotal,
  expenseReferenceMonth,
  isExpenseStopped,
  subscriptionActiveInMonth,
  subscriptionUrl,
  typeTotal,
  type ExpenseTypeId,
} from "@/lib/internal/expenses"
import { previousYear, toIsoDate } from "@/lib/performance/date-ranges"
import type { DateRange } from "@/lib/performance/types"
import type { FixedExpense } from "@/lib/onboarding/types"
import {
  DANISH_MONTHS_SHORT,
  formatAxisValue,
  formatCurrencyDKK,
  formatDateRangeLabel,
  formatSignedCurrency,
} from "@/lib/performance/format"

function defaultExpenseRange(): DateRange {
  const now = new Date()
  return { start: startOfYear(now), end: endOfYear(now) }
}

function rangesEqual(a: DateRange, b: DateRange) {
  return toIsoDate(a.start) === toIsoDate(b.start) && toIsoDate(a.end) === toIsoDate(b.end)
}

const CATEGORIES: {
  id: ExpenseTypeId
  label: string
  icon: typeof SparklesIcon | typeof MetaMark
  color: string
}[] = [
  { id: "ai", label: "AI Abonnementer", icon: SparklesIcon, color: "#7C3AED" },
  { id: "software", label: "Software abonnementer", icon: ReceiptIcon, color: "#2563EB" },
  { id: "office", label: "Husleje", icon: Building2Icon, color: "#0F2744" },
  { id: "marketing", label: "Marketing", icon: MetaMark, color: "#1877F2" },
  { id: "partner", label: "Partner aftale", icon: HandshakeIcon, color: "#0F766E" },
]

const CHART_SERIES = [
  { id: "total" as const, label: "Total", color: "#46C7A0" },
  ...CATEGORIES.map((item) => ({ id: item.id, label: EXPENSE_TYPES.find((type) => type.id === item.id)?.label ?? item.label, color: item.color })),
]

type ChartSeriesId = (typeof CHART_SERIES)[number]["id"]

function emptyLine(type: ExpenseTypeId): FixedExpense {
  const startsOn = new Date().toISOString().slice(0, 10)
  return {
    id: crypto.randomUUID(),
    type,
    name: "",
    amount: 0,
    startsOn,
    endsOn: null,
    pricePeriods: [{ id: crypto.randomUUID(), from: startsOn, to: null, amount: 0 }],
    note: "",
    url: "",
  }
}

function syncAmountFromPeriods(line: FixedExpense) {
  const open = [...line.pricePeriods].reverse().find((period) => !period.to)
  return open?.amount ?? line.pricePeriods[line.pricePeriods.length - 1]?.amount ?? 0
}

function formatCreated(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  const month = DANISH_MONTHS_SHORT[date.getMonth()]?.toLowerCase() ?? ""
  return `${date.getDate()}. ${month} ${date.getFullYear()}`
}

function subscriptionCountLabel(count: number) {
  return count === 1 ? "1 abonnement" : `${count} abonnementer`
}

export function ExpensesBoard() {
  const [lines, setLines] = useState<FixedExpense[]>([])
  const [saved, setSaved] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overviewCategory, setOverviewCategory] = useState<ExpenseTypeId>("ai")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange>(() => defaultExpenseRange())
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null)
  const [typeFilter, setTypeFilter] = useState<ExpenseTypeId[]>([])
  const [chartSeriesIds, setChartSeriesIds] = useState<ChartSeriesId[]>(["total"])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/admin/expenses")
      .then(async (response) => {
        const payload = (await response.json()) as { lines?: FixedExpense[]; error?: string }
        if (!response.ok) throw new Error(payload.error ?? "Kunne ikke hente omkostningerne.")
        return payload.lines ?? []
      })
      .then((next) => {
        if (!active) return
        setLines(next)
        setSaved(next)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Kunne ikke hente omkostningerne.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredLines = typeFilter.length === 0 ? lines : lines.filter((line) => typeFilter.includes(line.type))
  const scoped = filteredLines
  const referenceMonth = useMemo(() => expenseReferenceMonth(range), [range])
  const sheetYear = range.end.getFullYear()
  const comparisonRef = comparisonRange ? expenseReferenceMonth(comparisonRange) : null
  const periodLines = filteredLines.filter((line) =>
    subscriptionActiveInMonth(line, referenceMonth.year, referenceMonth.monthIndex)
  )
  const monthly = expenseMonthTotal(scoped, referenceMonth.year, referenceMonth.monthIndex)
  const comparisonTotal =
    comparisonRef == null
      ? null
      : expenseMonthTotal(scoped, comparisonRef.year, comparisonRef.monthIndex)
  const change = comparisonTotal == null ? null : monthly - comparisonTotal
  const compareLabel = comparisonRange
    ? formatDateRangeLabel(comparisonRange.start, comparisonRange.end)
    : ""
  const shownCategories = typeFilter.length === 0 ? CATEGORIES : CATEGORIES.filter((item) => typeFilter.includes(item.id))
  const expenseMonths = DANISH_MONTHS_SHORT.map((label) => ({ label }))
  const expenseMonthRows = [
    ...shownCategories.map((item) => ({
      label: item.label,
      color: item.color,
      icon: item.icon,
      values: DANISH_MONTHS_SHORT.map((_, monthIndex) =>
        expenseMonthTotal(
          filteredLines.filter((line) => line.type === item.id),
          sheetYear,
          monthIndex
        )
      ),
    })),
    {
      label: "Samlet",
      values: DANISH_MONTHS_SHORT.map((_, monthIndex) =>
        expenseMonthTotal(filteredLines, sheetYear, monthIndex)
      ),
    },
  ]
  const chartIsTotal = chartSeriesIds.includes("total")
  const chartTypes = chartSeriesIds.filter((id) => id !== "total")
  const chartLines = chartIsTotal ? filteredLines : filteredLines.filter((line) => chartTypes.includes(line.type))
  const chartLabel = chartIsTotal
    ? "Samlede omkostninger"
    : CHART_SERIES.filter((item) => item.id !== "total" && chartTypes.includes(item.id))
        .map((item) => item.label)
        .join(" + ")
  const chartSeries = DANISH_MONTHS_SHORT.map((label, monthIndex) => ({
    label,
    amount: expenseMonthOverlapsRange(sheetYear, monthIndex, range)
      ? expenseMonthTotal(chartLines, sheetYear, monthIndex)
      : 0,
    comparison:
      comparisonRange &&
      rangesEqual(comparisonRange, previousYear(range)) &&
      expenseMonthOverlapsRange(sheetYear, monthIndex, range)
        ? expenseMonthTotal(chartLines, sheetYear - 1, monthIndex)
        : undefined,
  }))
  const dirty = JSON.stringify(lines) !== JSON.stringify(saved)

  function update(id: string, patch: Partial<FixedExpense>) {
    setNotice(null)
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  async function save() {
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      const response = await fetch("/api/admin/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      })
      const payload = (await response.json()) as { lines?: FixedExpense[]; error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Kunne ikke gemme omkostningerne.")
      const next = payload.lines ?? []
      setLines(next)
      setSaved(next)
      setNotice("Abonnementerne er gemt.")
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunne ikke gemme omkostningerne.")
    } finally {
      setSaving(false)
    }
  }

  const chosenTypes = shownCategories
  const ChosenIcon = chosenTypes.length === 1 ? chosenTypes[0]?.icon : null
  const typeFilterLabel =
    typeFilter.length === 0
      ? "Alle typer"
      : chosenTypes
          .map((item) => EXPENSE_TYPES.find((type) => type.id === item.id)?.label)
          .filter(Boolean)
          .join(", ")

  if (loading) return <p className="text-sm text-[var(--text-secondary)]">Henter omkostninger…</p>

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 sm:gap-8">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Omkostninger
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Faste abonnementer hver måned. Vælg type, navn og pris.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            Periode
            <ExpenseDateRangePicker range={range} onRangeChange={setRange} />
          </div>
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            Abonnementstype
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="dashboard-chip w-full justify-between px-4 sm:w-52"
                    aria-label="Abonnementstype"
                  />
                }
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {ChosenIcon && chosenTypes[0] ? (
                    <ChosenIcon className="size-4 shrink-0" style={{ color: chosenTypes[0].color }} aria-hidden />
                  ) : null}
                  <span className="truncate">{typeFilterLabel}</span>
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuCheckboxItem
                  checked={typeFilter.length === 0}
                  onCheckedChange={() => setTypeFilter([])}
                >
                  Alle typer
                </DropdownMenuCheckboxItem>
                {CATEGORIES.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item.id}
                    checked={typeFilter.length === 0 || typeFilter.includes(item.id)}
                    onCheckedChange={() =>
                      setTypeFilter((current) => {
                        const active = current.length === 0 ? CATEGORIES.map((entry) => entry.id) : current
                        const next = active.includes(item.id)
                          ? active.filter((id) => id !== item.id)
                          : [...active, item.id]
                        return next.length === 0 || next.length === CATEGORIES.length ? [] : next
                      })
                    }
                  >
                    <item.icon className="size-4" style={{ color: item.color }} aria-hidden />
                    {EXPENSE_TYPES.find((type) => type.id === item.id)?.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            Sammenlign
            <ExpenseCompareRangePicker
              comparisonRange={comparisonRange}
              onComparisonRangeChange={setComparisonRange}
            />
          </div>
          <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? "Gemmer…" : "Gem"}
          </Button>
        </div>
      </header>

      {change == null ? null : (
        <p className={`text-sm font-medium tabular-nums ${change >= 0 ? "text-[#1f8a62]" : "text-[#c24545]"}`}>
          {change > 0 ? "Fremgang" : change < 0 ? "Nedgang" : "Uændret"} {formatSignedCurrency(change)} mod {compareLabel}
        </p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-[var(--text-secondary)]">{notice}</p> : null}

      <section className="w-full min-w-0" aria-label="Faste omkostninger">
        <div
          className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:[grid-template-columns:repeat(var(--kpi-cols),minmax(0,1fr))] [&>*]:w-full [&>*]:min-w-0"
          style={{ "--kpi-cols": String(shownCategories.length) } as CSSProperties}
        >
          {shownCategories.map((item) => (
            <InternalKpiCard
              key={item.id}
              dense
              label={item.label}
              value={formatCurrencyDKK(
                typeTotal(item.id, periodLines, referenceMonth.year, referenceMonth.monthIndex)
              )}
              icon={item.icon}
              color={item.color}
              change={subscriptionCountLabel(periodLines.filter((line) => line.type === item.id).length)}
            />
          ))}
        </div>
      </section>

      <Card className="dashboard-card dashboard-chart-card min-w-0 max-w-full overflow-hidden py-0">
        <CardHeader className="gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">Faste omkostninger</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {chartLabel} · {formatDateRangeLabel(range.start, range.end)}
            </p>
          </div>
          <div
            className="flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Kategori på grafen"
          >
            {CHART_SERIES.map((item) => {
              const active = chartSeriesIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  className={`shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${
                    active
                      ? "font-medium text-[#141414]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[#141414]"
                  }`}
                  style={active ? { borderColor: item.color } : undefined}
                  onClick={() =>
                    setChartSeriesIds((current) => {
                      if (item.id === "total") return ["total"]
                      const withoutTotal = current.filter((id) => id !== "total")
                      if (withoutTotal.includes(item.id)) {
                        const next = withoutTotal.filter((id) => id !== item.id)
                        return next.length === 0 ? ["total"] : next
                      }
                      return [...withoutTotal, item.id]
                    })
                  }
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
              <AreaChart data={chartSeries} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseCategoryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#46C7A0" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#46C7A0" stopOpacity={0.03} />
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
                  dataKey="amount"
                  name={chartLabel}
                  stroke="#46C7A0"
                  fill="url(#expenseCategoryFill)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#46C7A0", stroke: "#46C7A0" }}
                />
                {comparisonRange && rangesEqual(comparisonRange, previousYear(range)) ? (
                  <Line
                    type="monotone"
                    dataKey="comparison"
                    name={String(sheetYear - 1)}
                    stroke="#94a3b8"
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

      <Card className="dashboard-card min-w-0 max-w-full">
        <CardHeader className="gap-4">
          <h2 className="text-lg font-medium tracking-tight">Abonnementer</h2>
          <div
            className="flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Kategori i oversigten"
          >
            {shownCategories.map((item) => {
              const active = overviewCategory === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm transition-colors ${
                    active
                      ? "border-[#46C7A0] font-medium text-[#141414]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[#141414]"
                  }`}
                  onClick={() => {
                    setOverviewCategory(item.id)
                    setEditingId(null)
                  }}
                >
                  <item.icon className="size-4 shrink-0" style={{ color: item.color }} aria-hidden />
                  {item.label}
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {filteredLines.filter((line) => line.type === overviewCategory).length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Ingen abonnementer i denne kategori.</p>
          ) : (
            filteredLines
              .filter((line) => line.type === overviewCategory)
              .map((line) => {
                const editing = editingId === line.id
                return (
                  <div key={line.id} className="rounded-[15px] border border-border px-3 py-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                      <p className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                        {(line.type === "ai" || line.type === "software") && subscriptionUrl(line.name, line.url) ? (
                          <a
                            href={subscriptionUrl(line.name, line.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline-offset-4 hover:underline"
                          >
                            {line.name || "Nyt abonnement"}
                          </a>
                        ) : (
                          line.name || "Nyt abonnement"
                        )}
                      </p>
                      <p className="shrink-0 text-sm tabular-nums text-[var(--text-secondary)]">
                        {formatCurrencyDKK(expenseCurrentAmount(line))} / md.
                      </p>
                      <p className="shrink-0 text-sm text-[var(--text-secondary)]">
                        {formatCreated(line.startsOn)}
                        {line.endsOn ? ` – ${formatCreated(line.endsOn)}` : " –"}
                      </p>
                      {isExpenseStopped(line) ? (
                        <span className="shrink-0 rounded-full bg-[#f3f3f1] px-2 py-0.5 text-xs font-medium text-[#6b6b6b]">
                          Stoppet
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="shrink-0 text-sm font-medium text-[#141414] underline-offset-4 hover:underline"
                        onClick={() => setEditingId(editing ? null : line.id)}
                      >
                        {editing ? "Luk" : "Rediger"}
                      </button>
                    </div>
                    {editing ? (
                      <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
                          Navn
                          <input
                            className={onboardingFieldClass}
                            value={line.name}
                            aria-label="Navn"
                            onChange={(event) => update(line.id, { name: event.target.value })}
                          />
                        </label>
                        <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
                          Kategori
                          <select
                            className={onboardingFieldClass}
                            value={line.type}
                            aria-label="Kategori"
                            onChange={(event) => {
                              const type = event.target.value as ExpenseTypeId
                              update(line.id, { type })
                              setOverviewCategory(type)
                            }}
                          >
                            {CATEGORIES.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <ExpenseDateField
                          label="Opstart"
                          value={line.startsOn}
                          aria-label="Opstart"
                          onChange={(startsOn) => {
                            const pricePeriods = line.pricePeriods.map((period, index) =>
                              index === 0 ? { ...period, from: startsOn } : period
                            )
                            update(line.id, {
                              startsOn,
                              pricePeriods,
                              amount: syncAmountFromPeriods({ ...line, pricePeriods }),
                            })
                          }}
                        />
                        <ExpenseOptionalDateField
                          label="Slutdato"
                          value={line.endsOn}
                          aria-label="Slutdato"
                          onChange={(endsOn) => {
                            const lastIndex = line.pricePeriods.length - 1
                            const pricePeriods = line.pricePeriods.map((period, index) =>
                              index === lastIndex ? { ...period, to: endsOn } : period
                            )
                            update(line.id, {
                              endsOn,
                              pricePeriods,
                              amount: syncAmountFromPeriods({ ...line, pricePeriods }),
                            })
                          }}
                        />
                        <ExpensePricePeriodsEditor
                          line={line}
                          onChange={(patch) => update(line.id, patch)}
                        />
                        {line.type === "ai" || line.type === "software" ? (
                          <label className="grid gap-1 text-sm text-[var(--text-secondary)] md:col-span-2">
                            Link
                            <input
                              className={onboardingFieldClass}
                              value={line.url}
                              aria-label="Link"
                              placeholder="https://"
                              onChange={(event) => update(line.id, { url: event.target.value })}
                            />
                          </label>
                        ) : null}
                        <label className="grid gap-1 text-sm text-[var(--text-secondary)] md:col-span-2">
                          Note
                          <textarea
                            className={`${onboardingFieldClass} min-h-20 py-2`}
                            value={line.note}
                            aria-label="Note"
                            placeholder="Skriv noget"
                            onChange={(event) => update(line.id, { note: event.target.value })}
                          />
                        </label>
                        <button
                          type="button"
                          className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline md:col-span-2"
                          onClick={() => {
                            setNotice(null)
                            setEditingId(null)
                            setLines((current) => current.filter((item) => item.id !== line.id))
                          }}
                        >
                          Slet abonnement
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const line = emptyLine(overviewCategory)
                setLines((current) => [...current, line])
                setEditingId(line.id)
              }}
            >
              Tilføj abonnement
            </Button>
          </div>
        </CardContent>
      </Card>

      <InternalMonthSheet
        title={`Månedsopdeling ${sheetYear}`}
        description="Omkostninger pr. kategori hver måned"
        months={expenseMonths}
        rows={expenseMonthRows}
      />
      <InternalMonthSheet
        title={`Akkumuleret ${sheetYear}`}
        description="Hver måned lægges oven i de foregående, så totalen vokser gennem året"
        months={expenseMonths}
        running
        rows={expenseMonthRows.map((row) => {
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

    </div>
  )
}
