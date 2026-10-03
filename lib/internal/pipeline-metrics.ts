import { commercialAmountInMonth, commercialCurrentAmount, lineCoversMonth } from "@/lib/internal/commercial-billing"
import type { CommercialLine, Workspace } from "@/lib/onboarding/types"

function monthBounds(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, "0")
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

function revenueInMonth(lines: CommercialLine[], year: number, monthIndex: number) {
  const { start, end } = monthBounds(year, monthIndex)
  return lines.reduce((sum, line) => {
    if (line.cadence === "monthly" && lineCoversMonth(line, year, monthIndex)) {
      return sum + commercialAmountInMonth(line, year, monthIndex)
    }
    if (line.cadence === "once" && line.startsOn >= start && line.startsOn <= end) {
      return sum + line.amount
    }
    return sum
  }, 0)
}

export type PipelineKind = "onboarding" | "awaiting_start"

export function pipelineKindFor(status: Workspace["status"]): PipelineKind | null {
  if (status === "pending") return "onboarding"
  if (status === "awaiting_start") return "awaiting_start"
  return null
}

export function earliestLineStart(lines: CommercialLine[]): string {
  if (lines.length === 0) return ""
  return lines.reduce(
    (earliest, line) => (line.startsOn < earliest ? line.startsOn : earliest),
    lines[0].startsOn
  )
}

export function expectedPipelineMrr(lines: CommercialLine[], today: string): number {
  const asOf = new Date(`${today.slice(0, 10)}T00:00:00`)
  return lines
    .filter((line) => line.cadence === "monthly")
    .reduce((sum, line) => {
      if (line.startsOn > today) {
        const start = new Date(`${line.startsOn}T00:00:00`)
        return sum + commercialAmountInMonth(line, start.getFullYear(), start.getMonth())
      }
      if (line.startsOn <= today && (!line.endsOn || line.endsOn >= today)) {
        return sum + commercialCurrentAmount(line, asOf)
      }
      return sum
    }, 0)
}

export function projectedRevenueFrom(lines: CommercialLine[], fromIso: string, monthCount: number) {
  if (!fromIso || monthCount <= 0) return 0
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(from.getTime())) return 0
  let total = 0
  for (let index = 0; index < monthCount; index += 1) {
    const cursor = new Date(from.getFullYear(), from.getMonth() + index, 1)
    total += revenueInMonth(lines, cursor.getFullYear(), cursor.getMonth())
  }
  return total
}

export function monthsUntilStart(expectedStart: string, today: string) {
  if (!expectedStart || expectedStart <= today) return 0
  const start = new Date(`${expectedStart.slice(0, 10)}T00:00:00`)
  const now = new Date(`${today.slice(0, 10)}T00:00:00`)
  return Math.max(
    0,
    (start.getFullYear() - now.getFullYear()) * 12 + (start.getMonth() - now.getMonth())
  )
}

export function gapCashflowUntilStart(expectedMrr: number, expectedStart: string, today: string) {
  return monthsUntilStart(expectedStart, today) * expectedMrr
}
