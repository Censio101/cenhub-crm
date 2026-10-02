import { LEAD_STATUSES, type LeadSegmentId, type LeadStatusId } from "@/lib/leads"
import { matchServices, splitServiceText } from "@/lib/services/match"
import type { ClientService } from "@/lib/services/types"
import { parseLeadDateTime } from "@/lib/leads/lead-datetime"
import type { CellValue } from "@/lib/import/types"

/**
 * Lower-case letters and digits only, with Danish letters spelled out (æ ae, ø oe, å aa), so
 * "Postnummer", "Ydelse" and "Venter på kunden" compare the same however they are written.
 */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
}

/** Text of a cell, trimmed and capped. */
export function cellText(value: CellValue | undefined, max = 200): string {
  if (value === null || value === undefined) return ""
  return String(value).trim().slice(0, max)
}

/** Whether a cell has anything in it. */
export function hasValue(value: CellValue | undefined): boolean {
  return cellText(value, 1).length > 0
}

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)

/**
 * Day and time from a cell: real dates (already turned into text by the browser), Excel serial
 * numbers, and text like `24-03-2026 14:30`. Null when nothing readable is there.
 */
export function parseImportDateTime(
  value: CellValue | undefined
): { date: string; time: string | null } | null {
  if (value === null || value === undefined) return null

  const asNumber =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{5}(\.\d+)?$/.test(value.trim())
        ? Number(value)
        : null
  if (asNumber !== null && asNumber > 20_000 && asNumber < 80_000) {
    const days = Math.floor(asNumber)
    const minutes = Math.round((asNumber - days) * 1440)
    const day = new Date(EXCEL_EPOCH_UTC + days * 86_400_000)
    const date = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`
    const time =
      minutes > 0 && minutes < 1440
        ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
        : null
    return { date, time }
  }

  if (typeof value !== "string") return null
  return parseLeadDateTime(value)
}

/**
 * A number from a cell. Reads `12500`, `12.500,50` (Danish), `12,500.50` and `kr. 12 500`.
 * A lone `12.500` counts as twelve thousand five hundred (Danish style).
 */
export function parseImportNumber(value: CellValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null

  let text = value
    .replace(/[\s\u00a0]/g, "")
    .replace(/(kr\.?|dkk|eur|usd|€|\$|£)/gi, "")
    .trim()
  if (!text || !/^-?[\d.,]+$/.test(text)) return null

  const lastDot = text.lastIndexOf(".")
  const lastComma = text.lastIndexOf(",")
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ","
    const thousands = decimal === "." ? "," : "."
    text = text.split(thousands).join("").replace(decimal, ".")
  } else if (lastComma >= 0) {
    text = /^-?\d{1,3}(,\d{3})+$/.test(text) ? text.split(",").join("") : text.replace(",", ".")
  } else if (lastDot >= 0) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.split(".").join("")
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

/** Words people use for each status, next to the status id and its Danish label. */
const STATUS_WORDS: Record<LeadStatusId, string[]> = {
  not_qualified: ["notqualified", "unqualified", "ikkerelevant", "ikkekvalificeret"],
  lost: ["lost", "lostlead", "tabt", "mistet", "mistetlead", "afvist"],
  new_waiting_call: ["new", "newlead", "nyt", "nytlead", "ny"],
  call_1: ["call1", "opkald1", "1opkald", "ringet1"],
  call_2: ["call2", "opkald2", "2opkald", "ringet2"],
  call_3: ["call3", "opkald3", "3opkald", "ringet3"],
  call_4: ["call4", "opkald4", "4opkald", "ringet4"],
  call_5: ["call5", "opkald5", "5opkald", "ringet5"],
  waiting_on_client: ["waitingonclient", "venterpaakunden", "ventekunde"],
  client_waiting_on_us: ["clientwaitingonus", "kundenventerpaaos"],
  awaiting_proposal: ["awaitingproposal", "afventertilbud"],
  proposal_sent: ["proposalsent", "quotesent", "tilbudsendt", "tilbudsendte"],
  won: [
    "won",
    "wonclient",
    "wonlead",
    "vundet",
    "vundetkunde",
    "kunde",
    "customer",
    "solgt",
    "sold",
    "closed",
    "lukket",
  ],
}

const STATUS_LOOKUP = (() => {
  const map = new Map<string, LeadStatusId>()
  for (const status of LEAD_STATUSES) {
    map.set(foldText(status.id), status.id)
    map.set(foldText(status.label), status.id)
    for (const word of STATUS_WORDS[status.id]) map.set(word, status.id)
  }
  return map
})()

/** The status a cell means, or null when it does not match any of ours. */
export function parseImportStatus(value: CellValue | undefined): LeadStatusId | null {
  const key = foldText(cellText(value, 80))
  return key ? (STATUS_LOOKUP.get(key) ?? null) : null
}

const B2B_WORDS = new Set(["b2b", "erhverv", "business", "firma", "company", "virksomhed"])
const B2C_WORDS = new Set(["b2c", "privat", "private", "consumer", "forbruger", "person"])

export function parseImportSegment(value: CellValue | undefined): LeadSegmentId | null {
  const key = foldText(cellText(value, 40))
  if (B2B_WORDS.has(key)) return "b2b"
  if (B2C_WORDS.has(key)) return "b2c"
  return null
}

/**
 * Service slugs from a cell like `Tagdækning; Renovering`, matched against the client's own
 * services (slug or name), plus the words that matched nothing.
 */
export function parseImportServices(
  value: CellValue | undefined,
  services: readonly ClientService[]
): {
  ids: string[]
  unknown: string[]
} {
  return matchServices(splitServiceText(cellText(value, 400)), services)
}

export function normalizeEmail(value: CellValue | undefined): string {
  return cellText(value, 200).toLowerCase()
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
