import { da, enUS } from "date-fns/locale"
import { format } from "date-fns"

import type { Locale } from "@/lib/i18n/types"
import type { MetricFormat } from "@/lib/performance/types"

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

function dateFnsLocale(locale: Locale) {
  return locale === "en" ? enUS : da
}

export function formatDateRangeLabel(start: Date, end: Date, locale: Locale = "da"): string {
  const dateLocale = dateFnsLocale(locale)
  const startLabel = format(start, "d. MMM yyyy", { locale: dateLocale })
  const endLabel = format(end, "d. MMM yyyy", { locale: dateLocale })
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

const ENGLISH_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatMonthLabel(date: Date, locale: Locale = "da"): string {
  const months = locale === "en" ? ENGLISH_MONTHS_SHORT : DANISH_MONTHS_SHORT
  return months[date.getMonth()]
}

export function formatMetricValue(
  formatKind: MetricFormat,
  value: number | null | undefined
): string {
  if (value == null || !Number.isFinite(value)) return EMPTY
  switch (formatKind) {
    case "currency":
      return formatCurrencyDKK(value)
    case "percent":
      return formatPercentage(value)
    case "roas":
      return formatRoasMultiplier(value)
    case "integer":
    default:
      return formatInteger(value)
  }
}

export function formatAxisValue(value: number, formatKind: MetricFormat): string {
  if (!Number.isFinite(value)) return EMPTY
  if (formatKind === "currency") {
    return `${formatCompactNumber(value)}\u00a0kr.`
  }
  if (formatKind === "percent") {
    return `${Math.round(value)}\u00a0%`
  }
  if (formatKind === "roas") {
    return formatRoasMultiplier(value)
  }
  return formatInteger(value)
}
