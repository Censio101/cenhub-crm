import { randomUUID } from "node:crypto"

import type { LeadSource } from "@/lib/db/types"
import {
  isLeadPlatformId,
  isLeadSegmentId,
  type Lead,
  type LeadPlatformId,
  type LeadSegmentId,
} from "@/lib/leads"
import { nowLeadDateTime, parseLeadDateTime } from "@/lib/leads/lead-datetime"
import { escapePathSegment, getByPath, splitSourcePath } from "@/lib/leads/source-path"
import { splitServiceText } from "@/lib/services/match"

/** Canonical webhook body for generic lead funnels. */
export type CanonicalInboundLead = {
  fullName: string
  email?: string
  phone?: string
  leadDate: string
  /** `HH:mm`; missing when the sender only sent a day. */
  leadTime?: string
  segment?: string
  serviceIds?: string[]
  platform?: string
  companyName?: string
  address?: string
  zipCode?: string
  city?: string
  metaAdId?: string
  externalId?: string
  raw?: Record<string, unknown>
}

export type FieldMapping = Record<string, string>

/** Mapping targets starting with this prefix fill a custom lead sheet column. */
export const CUSTOM_FIELD_TARGET_PREFIX = "customFields."

export { escapePathSegment, getByPath, splitSourcePath }

export function applyFieldMapping(
  payload: Record<string, unknown>,
  mapping: FieldMapping
): Record<string, unknown> {
  if (Object.keys(mapping).length === 0) {
    return payload
  }
  const out: Record<string, unknown> = { ...payload }
  for (const [canonical, path] of Object.entries(mapping)) {
    const value = getByPath(payload, path)
    if (value === undefined) continue

    // `customFields.<key>` targets a lead sheet column instead of a standard field.
    if (canonical.startsWith(CUSTOM_FIELD_TARGET_PREFIX)) {
      const key = canonical.slice(CUSTOM_FIELD_TARGET_PREFIX.length)
      if (!key) continue
      const existing =
        out.customFields && typeof out.customFields === "object" && !Array.isArray(out.customFields)
          ? (out.customFields as Record<string, unknown>)
          : {}
      out.customFields = { ...existing, [key]: value }
      continue
    }

    out[canonical] = value
  }
  return out
}

function asString(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return ""
}

/** The day from date or date-time text (see `parseLeadDateTime`); null when unreadable. */
export function normalizeLeadDate(value: unknown): string | null {
  return parseLeadDateTime(value)?.date ?? null
}

/** Today in the CRM's home timezone, as `YYYY-MM-DD`. */
export function todayLeadDate(now: Date = new Date()): string {
  return nowLeadDateTime(now).date
}

export type InboundWarning = { field: string; message: string }

export type ParseInboundResult =
  | { ok: true; lead: CanonicalInboundLead; warnings: InboundWarning[] }
  | { ok: false; error: string }

export function parseCanonicalInbound(body: Record<string, unknown>): ParseInboundResult {
  const fullName = asString(body.fullName)
  const email = asString(body.email)
  const phone = asString(body.phone)
  const parsedDate = parseLeadDateTime(body.leadDate)
  const warnings: InboundWarning[] = []

  // Name, email and phone are only required in the Add Lead popup. From senders a lead is
  // still saved when one is missing (and reported as a warning); it is only refused when
  // there is nothing to identify the person at all.
  if (!fullName && !email && !phone) {
    return { ok: false, error: "fullName, email or phone is required" }
  }
  if (!fullName) {
    warnings.push({ field: "fullName", message: "Name is missing; the lead was saved without it" })
  }
  if (!email) {
    warnings.push({ field: "email", message: "Email is missing; the lead was saved without it" })
  }
  if (!phone) {
    warnings.push({ field: "phone", message: "Phone is missing; the lead was saved without it" })
  }

  // leadDate is optional text: a missing or unreadable value never rejects the lead. It falls
  // back to now (day, then time), and an unreadable one is reported as a warning. A day sent
  // without a time stays without one.
  if (!parsedDate && asString(body.leadDate)) {
    warnings.push({
      field: "leadDate",
      message: "Could not read a date from this text; the current date and time were used",
    })
  }
  const now = nowLeadDateTime()
  const leadDate = parsedDate?.date ?? now.date
  const leadTime = parsedDate ? (parsedDate.time ?? undefined) : now.time

  const serviceIdsRaw = body.serviceIds
  // A list, or a single text like "Roofing, Bathroom". Matched against the client's services later.
  const serviceIds = Array.isArray(serviceIdsRaw)
    ? serviceIdsRaw.map((item) => asString(item)).filter(Boolean)
    : typeof serviceIdsRaw === "string"
      ? splitServiceText(serviceIdsRaw)
      : undefined

  return {
    ok: true,
    warnings,
    lead: {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      leadDate,
      leadTime,
      segment: asString(body.segment) || undefined,
      serviceIds,
      platform: asString(body.platform) || undefined,
      companyName: asString(body.companyName) || undefined,
      address: asString(body.address) || undefined,
      zipCode: asString(body.zipCode) || undefined,
      city: asString(body.city) || undefined,
      metaAdId: asString(body.metaAdId) || undefined,
      externalId: asString(body.externalId) || undefined,
      raw:
        body.raw && typeof body.raw === "object"
          ? (body.raw as Record<string, unknown>)
          : undefined,
    },
  }
}

export function canonicalToLead(
  canonical: CanonicalInboundLead,
  defaults: {
    platform: string
    source: LeadSource
    /** Service slugs already matched against the client's services. */
    serviceIds?: string[]
  }
): Lead {
  const platformCandidate = canonical.platform ?? defaults.platform
  const platform: LeadPlatformId | "" = isLeadPlatformId(platformCandidate)
    ? platformCandidate
    : isLeadPlatformId(defaults.platform)
      ? defaults.platform
      : ""

  const segmentCandidate = canonical.segment ?? ""
  const segment: LeadSegmentId | "" = isLeadSegmentId(segmentCandidate) ? segmentCandidate : ""

  const serviceIds = defaults.serviceIds ?? []

  return {
    id: randomUUID(),
    date: canonical.leadDate,
    time: canonical.leadTime,
    fullName: canonical.fullName,
    email: canonical.email ?? "",
    phone: canonical.phone ?? "",
    segment,
    companyName: canonical.companyName ?? "",
    address: canonical.address ?? "",
    zipCode: canonical.zipCode ?? "",
    city: canonical.city ?? "",
    serviceIds,
    service: serviceIds[0] ?? "",
    platform,
    metaAdId: canonical.metaAdId ?? "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
    source: defaults.source,
    lockedFields: [],
  }
}

export const CANONICAL_INBOUND_EXAMPLE: CanonicalInboundLead = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "12345678",
  leadDate: "2026-03-24 14:30",
  segment: "b2c",
  serviceIds: ["windows"],
  platform: "website",
  companyName: "Example ApS",
  address: "Main St 1",
  zipCode: "2100",
  city: "Copenhagen",
  metaAdId: "120330000000000",
  externalId: "form-123",
}
