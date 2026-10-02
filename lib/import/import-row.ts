import { randomUUID } from "node:crypto"

import { coerceWebhookCustomFields } from "@/lib/lead-sheet/webhook-custom-fields"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"
import type { ClientService } from "@/lib/services/types"
import { IMPORT_CUSTOM_PREFIX } from "@/lib/import/column-mapping"
import { readMapped } from "@/lib/import/read-mapped"
import {
  cellText,
  hasValue,
  looksLikeEmail,
  normalizeEmail,
  parseImportDateTime,
  parseImportNumber,
  parseImportSegment,
  parseImportServices,
  parseImportStatus,
} from "@/lib/import/parse-values"
import type {
  CellValue,
  ColumnMapping,
  ImportChange,
  ImportOptions,
  ImportRowValues,
  ImportWarning,
} from "@/lib/import/types"
import { LEAD_STATUSES, type Lead } from "@/lib/leads"

export type BuiltImportLead =
  | { ok: false; reason: "no_contact" }
  | { ok: true; lead: Lead; warnings: ImportWarning[]; changes: ImportChange[] }

const statusLabel = (id: string) => LEAD_STATUSES.find((s) => s.id === id)?.label ?? id

/**
 * Turns one spreadsheet row into a lead with the same rules the webhooks use: a row needs a
 * name, email or phone; everything else is imported when it can be read and reported as a
 * warning when it cannot, so no row is lost over one odd cell.
 */
export function buildImportLead(input: {
  row: ImportRowValues
  mapping: ColumnMapping
  options: ImportOptions
  customFieldDefs: LeadSheetCustomFieldDef[]
  /** The client's services; the cell is matched against these. */
  services: readonly ClientService[]
  /** The day used for rows without a date. */
  today: string
}): BuiltImportLead {
  const { row, mapping, options, customFieldDefs, today } = input
  const warnings: ImportWarning[] = []
  const changes: ImportChange[] = []
  const read = (target: string) => readMapped(row, mapping, target)
  const note = (field: string, from: CellValue, to: string) => {
    const before = cellText(from, 120)
    if (before && before !== to) changes.push({ field, from: before, to })
  }

  const fullName = cellText(read("fullName"), 120)
  const email = normalizeEmail(read("email"))
  const phone = cellText(read("phone"), 40)
  if (!fullName && !email && !phone) return { ok: false, reason: "no_contact" }

  if (email && !looksLikeEmail(email)) {
    warnings.push({ field: "email", message: `“${email}” does not look like an email address` })
  }
  if ((mapping.fullName?.length ?? 0) > 1) {
    const parts = (mapping.fullName ?? [])
      .map((column) => cellText(row[column], 120))
      .filter(Boolean)
    if (parts.length > 1) changes.push({ field: "fullName", from: parts.join(" + "), to: fullName })
  }

  // Date and time
  const rawDate = read("date")
  let date = today
  let time: string | null = null
  if (mapping.date?.length) {
    const parsed = parseImportDateTime(rawDate)
    if (parsed) {
      date = parsed.date
      time = parsed.time
      note("date", rawDate, time ? `${date} ${time}` : date)
    } else if (hasValue(rawDate)) {
      warnings.push({
        field: "date",
        message: `Could not read a date from “${cellText(rawDate, 40)}”; the import day was used`,
      })
    } else {
      warnings.push({ field: "date", message: "No date in this row; the import day was used" })
    }
  }

  // Segment
  const rawSegment = read("segment")
  let segment: Lead["segment"] = ""
  if (hasValue(rawSegment)) {
    const parsed = parseImportSegment(rawSegment)
    if (parsed) {
      segment = parsed
      note("segment", rawSegment, parsed)
    } else {
      warnings.push({
        field: "segment",
        message: `Unknown segment “${cellText(rawSegment, 40)}” (use Privat/Erhverv or b2c/b2b)`,
      })
    }
  }

  // Services
  const serviceMatch = parseImportServices(read("serviceIds"), input.services)
  if (serviceMatch.unknown.length > 0) {
    warnings.push({
      field: "serviceIds",
      message: `Unknown service: ${serviceMatch.unknown.join(", ")}`,
    })
  }
  if (serviceMatch.ids.length > 0)
    note("serviceIds", read("serviceIds"), serviceMatch.ids.join(", "))

  // Status
  const rawStatus = read("status")
  let status = options.defaultStatus
  if (hasValue(rawStatus)) {
    const parsed = parseImportStatus(rawStatus)
    if (parsed) {
      status = parsed
      note("status", rawStatus, statusLabel(parsed))
    } else {
      warnings.push({
        field: "status",
        message: `Unknown status “${cellText(rawStatus, 40)}”; “${statusLabel(options.defaultStatus)}” was used`,
      })
    }
  }

  // Money
  const numberField = (target: "salesPrice" | "profit") => {
    const raw = read(target)
    if (!hasValue(raw)) return null
    const parsed = parseImportNumber(raw)
    if (parsed === null) {
      warnings.push({
        field: target,
        message: `Could not read a number from “${cellText(raw, 40)}”`,
      })
      return null
    }
    note(target, raw, String(parsed))
    return parsed
  }
  const salesPrice = numberField("salesPrice")
  const profit = numberField("profit")

  // Custom sheet columns
  const customRaw: Record<string, unknown> = {}
  for (const target of Object.keys(mapping)) {
    if (!target.startsWith(IMPORT_CUSTOM_PREFIX)) continue
    const value = read(target)
    if (hasValue(value)) customRaw[target.slice(IMPORT_CUSTOM_PREFIX.length)] = value
  }
  const custom = coerceWebhookCustomFields(customRaw, customFieldDefs)
  for (const warning of custom.warnings) {
    warnings.push({ field: `customFields.${warning.field}`, message: warning.message })
  }

  const lead: Lead = {
    id: randomUUID(),
    date,
    time,
    fullName,
    email,
    phone,
    segment,
    companyName: cellText(read("companyName"), 160),
    address: cellText(read("address"), 200),
    zipCode: cellText(read("zipCode"), 20),
    city: cellText(read("city"), 100),
    serviceIds: serviceMatch.ids,
    service: serviceMatch.ids[0] as Lead["service"],
    platform: options.defaultPlatform,
    metaAdId: "",
    status,
    salesPrice,
    profit,
    source: "import",
    lockedFields: [],
    customFields: custom.values,
  }
  return { ok: true, lead, warnings, changes }
}
