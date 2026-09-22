import { da } from "date-fns/locale"
import { format } from "date-fns"

const EMPTY = "–"

const numberDa = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
})

const compactDa = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
})

const percentDa = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatCurrencyDKK(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return `${numberDa.format(Math.round(value))}\u00a0kr.`
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return `${percentDa.format(value)}\u00a0%`
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return numberDa.format(Math.round(value))
}

const roasDa = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatRoasMultiplier(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return roasDa.format(value)
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  return compactDa.format(Math.round(value))
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  const rounded = Math.round(value)
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${formatCurrencyDKK(rounded)}`
}

export function formatSignedPercentage(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatPercentage(value)}`
}

export function formatDateRangeLabel(start: Date, end: Date): string {
  const startLabel = format(start, "d. MMM yyyy", { locale: da })
  const endLabel = format(end, "d. MMM yyyy", { locale: da })
  return `${startLabel} – ${endLabel}`
}

export const DANISH_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
] as const

export function formatMonthLabel(date: Date): string {
  return DANISH_MONTHS_SHORT[date.getMonth()]
}

export function formatAxisValue(
  value: number,
  formatKind: "currency" | "percent" | "integer"
): string {
  if (!Number.isFinite(value)) return EMPTY
  if (formatKind === "currency") {
    return `${formatCompactNumber(value)}\u00a0kr.`
  }
  if (formatKind === "percent") {
    return `${Math.round(value)}\u00a0%`
  }
  return formatInteger(value)
}
