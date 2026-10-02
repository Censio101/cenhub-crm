/**
 * A lead's "Date" is written as text: the day first, then the time (`2026-03-24 14:30`).
 * It is stored as a real day (`lead_date`, used for filters and sorting) plus an optional
 * `HH:mm` time (`lead_time`). Safe for browser and server.
 */

export const LEAD_TIMEZONE = "Europe/Copenhagen"

export type LeadDateTime = {
  /** `YYYY-MM-DD` */
  date: string
  /** `HH:mm`, or null when the text had no time. */
  time: string | null
}

function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function readTime(rest: string): string | null {
  const match = /(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?/.exec(rest)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return `${pad(hour)}:${match[2]}`
}

/**
 * Reads the day and (when present) the time from text. Accepts `2026-03-24`,
 * `2026-03-24 14:30`, ISO timestamps, and day-first formats such as `24-03-2026` and
 * `24.03.2026 14:30`. Returns null when no day can be read.
 */
export function parseLeadDateTime(value: unknown): LeadDateTime | null {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return null

  const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (isoDay) {
    return {
      date: `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}`,
      time: readTime(raw.slice(isoDay[0].length)),
    }
  }

  const dayFirst = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/.exec(raw)
  if (dayFirst) {
    const day = Number(dayFirst[1])
    const month = Number(dayFirst[2])
    const year = Number(dayFirst[3])
    if (!isRealDay(year, month, day)) return null
    return {
      date: `${year}-${pad(month)}-${pad(day)}`,
      time: readTime(raw.slice(dayFirst[0].length)),
    }
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: null,
  }
}

/** The current day and time in the CRM's home timezone. */
export function nowLeadDateTime(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00"
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  }
}

/** A stored day plus optional time, as the text shown and edited on the lead sheet. */
export function formatLeadDateTime(date: string, time?: string | null): string {
  return time ? `${date} ${time}` : date
}
