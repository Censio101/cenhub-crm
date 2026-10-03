import type { CommercialBillingPeriod, CommercialLine } from "@/lib/onboarding/types"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return ISO_DATE.test(trimmed) ? trimmed : null
}

function monthIsoBounds(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, "0")
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function sortBillingPeriods(periods: CommercialBillingPeriod[]) {
  return [...periods].sort((a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id))
}

function periodsOverlap(a: CommercialBillingPeriod, b: CommercialBillingPeriod) {
  const aEnd = a.to ?? "9999-12-31"
  const bEnd = b.to ?? "9999-12-31"
  return a.from <= bEnd && b.from <= aEnd
}

function amountFromOpenPeriod(periods: CommercialBillingPeriod[]) {
  const open = [...periods].reverse().find((period) => !period.to)
  return open?.amount ?? periods[periods.length - 1]?.amount ?? 0
}

function normalizeBillingPeriods(
  raw: Partial<CommercialBillingPeriod>[] | undefined,
  fallbackAmount: number,
  startsOn: string,
  endsOn: string | null,
  lineId: string,
  lineName: string
): CommercialBillingPeriod[] {
  const parsed = (raw ?? [])
    .flatMap((entry, index) => {
      const from = parseIsoDate(entry.from)
      const amount = entry.amount
      if (!from || amount === undefined || !Number.isFinite(amount) || amount < 0) return []
      const to = parseIsoDate(entry.to ?? null)
      if (to && to < from) return []
      const id = entry.id?.trim() || `${lineId}-bp${index + 1}`
      const note = entry.note?.trim().slice(0, 240) ?? ""
      return [{ id, from, to, amount: amount as number, note }]
    })
    .slice(0, 36)

  if (parsed.length === 0) {
    return [{ id: `${lineId}-bp1`, from: startsOn, to: endsOn, amount: fallbackAmount, note: "" }]
  }

  const sorted = sortBillingPeriods(parsed)
  for (let index = 1; index < sorted.length; index += 1) {
    if (periodsOverlap(sorted[index - 1], sorted[index])) {
      throw new Error(`Overlappende prisperioder for ${lineName}.`)
    }
  }
  return sorted
}

export function resolveBillingPeriods(line: CommercialLine): CommercialBillingPeriod[] {
  if (line.billingPeriods?.length) return sortBillingPeriods(line.billingPeriods)
  return [
    {
      id: `${line.id}-bp1`,
      from: line.startsOn,
      to: line.endsOn,
      amount: line.amount,
      note: line.note,
    },
  ]
}

type NormalizeCommercialLineInput = Omit<Partial<CommercialLine>, "billingPeriods"> & {
  workspaceId: string
  billingPeriods?: Partial<CommercialBillingPeriod>[]
}

export function normalizeCommercialLine(
  input: NormalizeCommercialLineInput,
  fallbackId: string
): CommercialLine {
  const name = input.name?.trim() ?? ""
  if (!name) throw new Error("Pakken skal have et navn.")
  const startsOn = parseIsoDate(input.startsOn)
  if (!startsOn) throw new Error("Startdatoen er ugyldig.")
  const endsOn = parseIsoDate(input.endsOn ?? null)
  if (endsOn && endsOn < startsOn) throw new Error("Slutdatoen ligger før startdatoen.")

  const amountSeed = Number(input.amount)
  if (!Number.isFinite(amountSeed) || amountSeed < 0) throw new Error("Prisen er ugyldig.")

  const id = input.id?.trim() || fallbackId
  const billingPeriods = normalizeBillingPeriods(
    input.billingPeriods,
    amountSeed,
    startsOn,
    endsOn,
    id,
    name
  )

  for (const period of billingPeriods) {
    if (period.from < startsOn) throw new Error(`Prisperiode kan ikke starte før aftalen for ${name}.`)
    if (endsOn && period.from > endsOn) throw new Error(`Prisperiode ligger efter slutdato for ${name}.`)
    if (endsOn && period.to && period.to > endsOn) {
      throw new Error(`Prisperiode slutter efter aftalen for ${name}.`)
    }
  }

  return {
    id,
    workspaceId: input.workspaceId,
    category: input.category!,
    name,
    amount: amountFromOpenPeriod(billingPeriods),
    cadence: input.cadence!,
    startsOn,
    endsOn,
    note: input.note?.trim().slice(0, 160) ?? "",
    billingPeriods,
  }
}

export function lineCoversMonth(line: CommercialLine, year: number, monthIndex: number) {
  const { start, end } = monthIsoBounds(year, monthIndex)
  if (line.cadence !== "monthly") return false
  if (line.startsOn > end) return false
  if (line.endsOn && line.endsOn < start) return false
  return true
}

export function commercialAmountInMonth(line: CommercialLine, year: number, monthIndex: number) {
  if (!lineCoversMonth(line, year, monthIndex)) return 0
  const { start, end } = monthIsoBounds(year, monthIndex)
  const period = resolveBillingPeriods(line).find(
    (item) => item.from <= end && (!item.to || item.to >= start)
  )
  return period?.amount ?? 0
}

export function commercialCurrentAmount(line: CommercialLine, at: Date = new Date()) {
  return commercialAmountInMonth(line, at.getFullYear(), at.getMonth())
}

export function lineHasVariablePricing(line: CommercialLine) {
  return resolveBillingPeriods(line).length > 1
}
