import { randomUUID } from "node:crypto"

import type { LeadSource } from "@/lib/db/types"
import {
  isLeadPlatformId,
  isLeadSegmentId,
  type Lead,
  type LeadPlatformId,
  type LeadSegmentId,
} from "@/lib/leads"
import { isServiceId } from "@/lib/performance/services"

/** Canonical webhook body for generic lead funnels. */
export type CanonicalInboundLead = {
  fullName: string
  email?: string
  phone?: string
  leadDate: string
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

export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

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
    if (value !== undefined) {
      out[canonical] = value
    }
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

function normalizeLeadDate(value: unknown): string | null {
  const raw = asString(value)
  if (!raw) return null
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (isoDay) return `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, "0")
  const d = String(parsed.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export type ParseInboundResult =
  | { ok: true; lead: CanonicalInboundLead }
  | { ok: false; error: string }

export function parseCanonicalInbound(
  body: Record<string, unknown>
): ParseInboundResult {
  const fullName = asString(body.fullName)
  const email = asString(body.email)
  const phone = asString(body.phone)
  const leadDate = normalizeLeadDate(body.leadDate)

  if (!fullName) {
    return { ok: false, error: "fullName is required" }
  }
  if (!email && !phone) {
    return { ok: false, error: "email or phone is required" }
  }
  if (!leadDate) {
    return { ok: false, error: "leadDate is required (YYYY-MM-DD or ISO date)" }
  }

  const serviceIdsRaw = body.serviceIds
  const serviceIds = Array.isArray(serviceIdsRaw)
    ? serviceIdsRaw.map((item) => asString(item)).filter(Boolean)
    : undefined

  return {
    ok: true,
    lead: {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      leadDate,
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
  defaults: { platform: string; source: LeadSource }
): Lead {
  const platformCandidate = canonical.platform ?? defaults.platform
  const platform: LeadPlatformId | "" = isLeadPlatformId(platformCandidate)
    ? platformCandidate
    : isLeadPlatformId(defaults.platform)
      ? defaults.platform
      : ""

  const segmentCandidate = canonical.segment ?? ""
  const segment: LeadSegmentId | "" = isLeadSegmentId(segmentCandidate)
    ? segmentCandidate
    : ""

  const serviceIds = (canonical.serviceIds ?? []).filter(isServiceId)

  return {
    id: randomUUID(),
    date: canonical.leadDate,
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
  leadDate: "2026-03-24",
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
