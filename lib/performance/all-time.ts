import { startOfMonth } from "date-fns"

import { getLeadDataDateRange } from "./from-leads"
import { parseIsoDate } from "./date-ranges"
import type { DatePreset, DateRange } from "./types"
import type { Lead } from "@/lib/leads"

type AllTimeInput = {
  leads: readonly Lead[]
  adSpendByMonth: Record<string, number>
}

/**
 * Where "All time" begins: the earliest of the first lead and the first month with ad spend.
 * Starting at the first lead alone drops every ad month before it (a client can run ads for
 * months before the first lead is logged).
 */
export function resolveAllTimeStart({ leads, adSpendByMonth }: AllTimeInput): Date | null {
  const candidates: Date[] = []

  const leadStart = parseIsoDate(getLeadDataDateRange(leads)?.start)
  if (leadStart) candidates.push(leadStart)

  const firstSpendMonth = Object.entries(adSpendByMonth)
    .filter(([, spend]) => Number.isFinite(spend) && spend > 0)
    .map(([key]) => key)
    .sort()[0]
  if (firstSpendMonth) {
    const spendStart = parseIsoDate(`${firstSpendMonth}-01`)
    if (spendStart) candidates.push(spendStart)
  }

  if (candidates.length === 0) return null
  return candidates.reduce((earliest, date) => (date < earliest ? date : earliest))
}

/**
 * The range the dashboard actually measures. "All time" is stored as 1 Jan 2000 in the URL, so
 * it is clamped to where this client's data really starts; every other preset is used as is.
 */
export function resolveMeasuredRange(
  preset: DatePreset,
  range: DateRange,
  input: AllTimeInput
): DateRange {
  if (preset !== "all_time") return range
  const start = resolveAllTimeStart(input) ?? startOfMonth(range.end)
  return { start, end: range.end }
}
