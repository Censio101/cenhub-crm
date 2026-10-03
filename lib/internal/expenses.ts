import { endOfMonth, startOfMonth } from "date-fns"

import type { ExpensePricePeriod, FixedExpense } from "@/lib/onboarding/types"
import type { DateRange } from "@/lib/performance/types"

export const EXPENSE_TYPES = [
  { id: "ai", label: "AI" },
  { id: "software", label: "Software" },
  { id: "office", label: "Husleje" },
  { id: "marketing", label: "Marketing" },
  { id: "partner", label: "Partner aftale" },
] as const

export type ExpenseTypeId = FixedExpense["type"]

const TYPE_IDS = new Set<string>(EXPENSE_TYPES.map((type) => type.id))
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const SUBSCRIPTION_SITES: { match: string; url: string }[] = [
  { match: "chatgpt", url: "https://chatgpt.com" },
  { match: "claude", url: "https://claude.ai" },
  { match: "cursor", url: "https://cursor.com" },
  { match: "workspace", url: "https://workspace.google.com" },
  { match: "figma", url: "https://www.figma.com" },
  { match: "adobe", url: "https://www.adobe.com" },
]

export function isExpenseType(value: string): value is ExpenseTypeId {
  return TYPE_IDS.has(value)
}

export function expenseTypeLabel(type: ExpenseTypeId) {
  return EXPENSE_TYPES.find((item) => item.id === type)?.label ?? type
}

export function subscriptionUrl(name: string, url?: string) {
  const stored = url?.trim() ?? ""
  if (/^https?:\/\//i.test(stored)) return stored
  const key = name.trim().toLowerCase()
  return SUBSCRIPTION_SITES.find((site) => key.includes(site.match))?.url ?? ""
}

function parseIsoDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return ISO_DATE.test(trimmed) ? trimmed : null
}

function monthIsoBounds(year: number, monthIndex: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const month = String(monthIndex + 1).padStart(2, "0")
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

function periodsOverlap(a: ExpensePricePeriod, b: ExpensePricePeriod) {
  const aEnd = a.to ?? "9999-12-31"
  const bEnd = b.to ?? "9999-12-31"
  return a.from <= bEnd && b.from <= aEnd
}

export function sortPricePeriods(periods: ExpensePricePeriod[]) {
  return [...periods].sort((a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id))
}

function normalizePricePeriods(
  raw: Partial<ExpensePricePeriod>[] | undefined,
  fallbackAmount: number,
  startsOn: string,
  endsOn: string | null,
  fallbackId: string,
  name: string
): ExpensePricePeriod[] {
  const parsed = (raw ?? [])
    .flatMap((entry, index) => {
      const from = parseIsoDate(entry.from)
      const amount = entry.amount
      if (!from || amount === undefined || !Number.isFinite(amount) || amount < 0) return []
      const to = parseIsoDate(entry.to ?? null)
      if (to && to < from) return []
      const id = entry.id?.trim() || `${fallbackId}-p${index + 1}`
      return [{ id, from, to, amount: amount as number }]
    })
    .slice(0, 24)

  if (parsed.length === 0) {
    return [{ id: `${fallbackId}-p1`, from: startsOn, to: endsOn, amount: fallbackAmount }]
  }

  const sorted = sortPricePeriods(parsed)
  for (let index = 1; index < sorted.length; index += 1) {
    if (periodsOverlap(sorted[index - 1], sorted[index])) {
      throw new Error(`Overlappende prisperioder for ${name}.`)
    }
  }
  return sorted
}

function amountFromOpenPeriod(periods: ExpensePricePeriod[]) {
  const open = [...periods].reverse().find((period) => !period.to)
  return open?.amount ?? periods[periods.length - 1]?.amount ?? 0
}

export function coerceFixedExpense(entry: Partial<FixedExpense>, fallbackId: string): FixedExpense {
  const type = entry.type ?? ""
  if (!isExpenseType(type)) throw new Error("Ugyldig abonnementstype.")
  const name = entry.name?.trim() ?? ""
  if (!name) throw new Error("Ugyldigt navn på abonnement.")
  const startsOn = parseIsoDate(entry.startsOn)
  if (!startsOn) throw new Error(`Ugyldig opstartsdato for ${name}.`)
  const endsOn = parseIsoDate(entry.endsOn ?? null)
  if (endsOn && endsOn < startsOn) throw new Error(`Slutdato skal være efter opstart for ${name}.`)

  const legacyAmount = typeof entry.amount === "number" ? entry.amount : Number(entry.amount)
  if (Number.isFinite(legacyAmount) && legacyAmount < 0) {
    throw new Error(`Ugyldigt beløb for ${name}.`)
  }
  const amountSeed = Number.isFinite(legacyAmount) && legacyAmount >= 0 ? legacyAmount : 0
  const id = entry.id?.trim() || fallbackId
  const pricePeriods = normalizePricePeriods(entry.pricePeriods, amountSeed, startsOn, endsOn, id, name)

  for (const period of pricePeriods) {
    if (period.from < startsOn) throw new Error(`Prisperiode kan ikke starte før opstart for ${name}.`)
    if (endsOn && period.from > endsOn) throw new Error(`Prisperiode ligger efter slutdato for ${name}.`)
    if (endsOn && period.to && period.to > endsOn) throw new Error(`Prisperiode slutter efter abonnementet for ${name}.`)
  }

  const amount = amountFromOpenPeriod(pricePeriods)
  const rawUrl = entry.url?.trim() ?? ""
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : subscriptionUrl(name, rawUrl)

  return {
    id,
    type,
    name,
    amount,
    startsOn,
    endsOn,
    pricePeriods,
    note: entry.note?.trim() ?? "",
    url,
  }
}

export function normalizeExpenses(entries: Partial<FixedExpense>[]): FixedExpense[] {
  return entries.flatMap((entry) => {
    if (!entry.id || !entry.type || !isExpenseType(entry.type)) return []
    try {
      return [coerceFixedExpense(entry, entry.id)]
    } catch {
      return []
    }
  })
}

export function subscriptionActiveInMonth(line: FixedExpense, year: number, monthIndex: number) {
  const { start, end } = monthIsoBounds(year, monthIndex)
  if (line.startsOn > end) return false
  if (line.endsOn && line.endsOn < start) return false
  return true
}

export function expenseAmountInMonth(line: FixedExpense, year: number, monthIndex: number) {
  if (!subscriptionActiveInMonth(line, year, monthIndex)) return 0
  const { start, end } = monthIsoBounds(year, monthIndex)
  const period = sortPricePeriods(line.pricePeriods).find(
    (item) => item.from <= end && (!item.to || item.to >= start)
  )
  return period?.amount ?? 0
}

/** @deprecated use subscriptionActiveInMonth */
export function expenseActiveInMonth(line: FixedExpense, year: number, monthIndex: number) {
  return subscriptionActiveInMonth(line, year, monthIndex) && expenseAmountInMonth(line, year, monthIndex) > 0
}

export function expenseMonthTotal(lines: FixedExpense[], year: number, monthIndex: number) {
  return lines.reduce((sum, line) => sum + expenseAmountInMonth(line, year, monthIndex), 0)
}

export function expenseMonthOverlapsRange(year: number, monthIndex: number, range: DateRange) {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1))
  const monthEnd = endOfMonth(monthStart)
  return monthEnd >= range.start && monthStart <= range.end
}

export function expenseReferenceMonth(range: DateRange) {
  return { year: range.end.getFullYear(), monthIndex: range.end.getMonth() }
}

export function expenseCurrentAmount(line: FixedExpense, at: Date = new Date()) {
  return expenseAmountInMonth(line, at.getFullYear(), at.getMonth())
}

export function isExpenseStopped(line: FixedExpense, at: Date = new Date()) {
  const today = parseIsoDate(at.toISOString().slice(0, 10))
  return Boolean(line.endsOn && today && line.endsOn < today)
}

export function typeTotal(
  type: ExpenseTypeId,
  lines: FixedExpense[],
  year: number,
  monthIndex: number
) {
  return lines
    .filter((line) => line.type === type)
    .reduce((sum, line) => sum + expenseAmountInMonth(line, year, monthIndex), 0)
}

export function monthlyExpenseTotal(lines: FixedExpense[], at: Date = new Date()) {
  return expenseMonthTotal(lines, at.getFullYear(), at.getMonth())
}
