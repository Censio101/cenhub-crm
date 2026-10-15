import { columnVisibilityKey } from "@/lib/lead-sheet/client-visibility"
import type {
  BuiltinColumnKey,
  LeadSheetTemplateColumn,
  ResolvedLeadSheetConfig,
} from "@/lib/lead-sheet/types"
import {
  DEFAULT_NOTIFY_CLOSING_TEMPLATE,
  DEFAULT_NOTIFY_INTRO_TEMPLATE,
  DEFAULT_NOTIFY_SUBJECT_TEMPLATE,
  templateOrDefault,
} from "@/lib/email/lead-notify-defaults"
import { builtinLabelDa } from "@/lib/email/lead-notify-labels-da"
import { LEAD_SEGMENTS, LEAD_STATUSES, type Lead } from "@/lib/leads"
import { serviceName, type ClientService } from "@/lib/services/types"

const ADDRESS_KEYS = new Set(["builtin:address", "builtin:zipCode", "builtin:city"])

export type LeadNotifyFormatInput = {
  lead: Lead
  sheet: ResolvedLeadSheetConfig
  services: readonly ClientService[]
  includedKeys: readonly string[]
  funnelName: string
  subjectTemplate: string | null | undefined
  introTemplate: string | null | undefined
  closingTemplate: string | null | undefined
}

function includedSet(keys: readonly string[]): Set<string> {
  return new Set(keys)
}

function segmentLabelDa(segment: Lead["segment"]): string {
  if (!segment) return ""
  return LEAD_SEGMENTS.find((entry) => entry.id === segment)?.label ?? segment
}

function statusLabelDa(status: Lead["status"]): string {
  return LEAD_STATUSES.find((entry) => entry.id === status)?.label ?? status
}

function serviceLabelsDa(lead: Lead, services: readonly ClientService[]): string {
  const slugs = lead.serviceIds?.length ? lead.serviceIds : lead.service ? [lead.service] : []
  if (slugs.length === 0) return ""
  const byId = new Map(services.map((service) => [service.id, service]))
  return slugs
    .map((slug) => {
      const service = byId.get(slug)
      return service ? serviceName(service, "da") : slug
    })
    .filter(Boolean)
    .join(", ")
}

function formatCombinedAddress(lead: Lead): string {
  const parts = [lead.address?.trim(), [lead.zipCode?.trim(), lead.city?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
  return parts.trim()
}

function builtinValue(lead: Lead, key: BuiltinColumnKey): string {
  switch (key) {
    case "fullName":
      return lead.fullName?.trim() ?? ""
    case "email":
      return lead.email?.trim() ?? ""
    case "phone":
      return lead.phone?.trim() ?? ""
    case "segment":
      return segmentLabelDa(lead.segment)
    case "companyName":
      return lead.companyName?.trim() ?? ""
    case "address":
      return lead.address?.trim() ?? ""
    case "zipCode":
      return lead.zipCode?.trim() ?? ""
    case "city":
      return lead.city?.trim() ?? ""
    case "serviceIds":
      return ""
    case "date":
      return lead.date?.trim() ?? ""
    case "status":
      return statusLabelDa(lead.status)
    case "wonDate":
      return lead.wonDate?.trim() ?? ""
    case "salesPrice":
      return lead.salesPrice != null ? String(lead.salesPrice) : ""
    case "profit":
      return lead.profit != null ? String(lead.profit) : ""
    case "ltv":
      return lead.ltv != null ? String(lead.ltv) : ""
    case "metaAdId":
      return lead.metaAdId?.trim() ?? ""
    default:
      return ""
  }
}

function shouldCombineAddress(included: Set<string>): boolean {
  const count = [...ADDRESS_KEYS].filter((key) => included.has(key)).length
  return count >= 2
}

export function buildLeadNotifyBodyLinesDa(input: {
  lead: Lead
  sheet: ResolvedLeadSheetConfig
  services: readonly ClientService[]
  includedKeys: readonly string[]
}): string[] {
  const included = includedSet(input.includedKeys)
  const lines: string[] = []
  let addressBlockDone = false
  const combineAddress = shouldCombineAddress(included)
  const serviceLine = included.has("builtin:serviceIds")
    ? serviceLabelsDa(input.lead, input.services)
    : ""

  const columns = [...input.sheet.columns].sort((a, b) => a.sortIndex - b.sortIndex)

  for (const column of columns) {
    const key = columnVisibilityKey(column)
    if (!included.has(key)) continue

    if (column.kind === "builtin" && column.builtinKey === "serviceIds") {
      if (serviceLine) lines.push(`${builtinLabelDa("serviceIds")}: ${serviceLine}`)
      continue
    }

    if (column.kind === "builtin" && ADDRESS_KEYS.has(key)) {
      if (combineAddress) {
        if (addressBlockDone) continue
        const combined = formatCombinedAddress(input.lead)
        if (combined) {
          lines.push(`${builtinLabelDa("address")}: ${combined}`)
          addressBlockDone = true
        }
      } else {
        const value = builtinValue(input.lead, column.builtinKey)
        if (value) lines.push(`${builtinLabelDa(column.builtinKey)}: ${value}`)
      }
      continue
    }

    if (column.kind === "builtin") {
      const value = builtinValue(input.lead, column.builtinKey)
      if (value) lines.push(`${builtinLabelDa(column.builtinKey)}: ${value}`)
      continue
    }

    const raw = input.lead.customFields?.[column.customField.fieldKey]
    if (raw === null || raw === undefined || raw === "") continue
    const value =
      typeof raw === "object" ? JSON.stringify(raw) : String(raw).trim()
    if (!value) continue
    lines.push(`${column.customField.label}: ${value}`)
  }

  return lines
}

export function interpolateNotifySubject(
  template: string,
  context: { funnelName: string; lead: Lead; services: readonly ClientService[] }
): string {
  const service = serviceLabelsDa(context.lead, context.services)
  const leadNavn = context.lead.fullName?.trim() ?? ""
  let subject = template
    .replaceAll("{webhookNavn}", context.funnelName)
    .replaceAll("{leadNavn}", leadNavn)
    .replaceAll("{service}", service)

  subject = subject.replace(/\s*\|\s*$/, "").trim()
  if (subject.includes("|") && !service) {
    subject = subject.replace(/\s*\|\s*[^|]*$/, "").trim()
  }
  return subject || "Nyt lead"
}

export function buildLeadNotifyMessageDa(input: LeadNotifyFormatInput): {
  subject: string
  intro: string
  closing: string
  bodyLines: string[]
  text: string
  html: string
} {
  const intro = templateOrDefault(input.introTemplate, DEFAULT_NOTIFY_INTRO_TEMPLATE)
  const closing = templateOrDefault(input.closingTemplate, DEFAULT_NOTIFY_CLOSING_TEMPLATE)
  const subjectTemplate = templateOrDefault(input.subjectTemplate, DEFAULT_NOTIFY_SUBJECT_TEMPLATE)
  const bodyLines = buildLeadNotifyBodyLinesDa({
    lead: input.lead,
    sheet: input.sheet,
    services: input.services,
    includedKeys: input.includedKeys,
  })
  const subject = interpolateNotifySubject(subjectTemplate, {
    funnelName: input.funnelName,
    lead: input.lead,
    services: input.services,
  })

  const text = [intro, "", ...bodyLines, "", closing].join("\n")

  const htmlBody = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#3d342c;">${escapeHtml(line)}</p>`
    )
    .join("")
  const htmlClosing = closing
    .split("\n")
    .map(
      (line) =>
        `<p style="margin:0;font-size:15px;line-height:1.5;color:#57534e;">${escapeHtml(line)}</p>`
    )
    .join("")
  const html = `<!DOCTYPE html>
<html lang="da">
  <body style="margin:0;padding:24px;background:#f6f1eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d8;border-radius:16px;padding:28px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#57534e;">${escapeHtml(intro)}</p>
      ${htmlBody}
      <div style="margin-top:24px;">${htmlClosing}</div>
    </div>
  </body>
</html>`

  return { subject, intro, closing, bodyLines, text, html }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/** Example lead for admin preview / test send (Danish sample values). */
export function sampleLeadForNotifyPreview(): Lead {
  return {
    id: "preview",
    date: "2026-03-24",
    time: null,
    fullName: "Anna Jensen",
    email: "anna@example.dk",
    phone: "+45 20123456",
    segment: "b2c",
    companyName: "Example ApS",
    address: "Hovedgaden 1",
    zipCode: "2100",
    city: "København Ø",
    serviceIds: [],
    platform: "website",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
    ltv: null,
    customFields: {},
  }
}

export function buildLeadNotifyPreview(input: {
  sheet: ResolvedLeadSheetConfig
  services: readonly ClientService[]
  includedKeys: readonly string[]
  funnelName: string
  subjectTemplate: string | null | undefined
  introTemplate: string | null | undefined
  closingTemplate: string | null | undefined
}) {
  const sample = sampleLeadForNotifyPreview()
  if (input.services[0]) sample.serviceIds = [input.services[0].id]
  const message = buildLeadNotifyMessageDa({
    lead: sample,
    sheet: input.sheet,
    services: input.services,
    includedKeys: input.includedKeys,
    funnelName: input.funnelName,
    subjectTemplate: input.subjectTemplate,
    introTemplate: input.introTemplate,
    closingTemplate: input.closingTemplate,
  })
  return {
    subjectExample: message.subject,
    intro: message.intro,
    closing: message.closing,
    bodyStructure: message.bodyLines.map((line) => {
      const colon = line.indexOf(": ")
      if (colon === -1) return { label: line, placeholder: "…" }
      return { label: line.slice(0, colon), placeholder: "…" }
    }),
  }
}
