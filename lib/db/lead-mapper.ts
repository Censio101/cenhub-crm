import { randomUUID } from "node:crypto"

import type { LeadRow } from "@/lib/db/types"
import {
  isLeadPlatformId,
  isLeadSegmentId,
  isLeadStatusId,
  type Lead,
  type LeadPlatformId,
  type LeadSegmentId,
  type LeadStatusId,
} from "@/lib/leads"
import { leadFieldHasValue } from "@/lib/leads/lead-field-values"
import { isServiceId, type ServiceId } from "@/lib/performance/services"

export const META_LOCKED_FIELDS = [
  "date",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "address",
  "zipCode",
  "city",
  "metaAdId",
] as const

export type LeadPatch = Partial<{
  date: string
  time: string | null
  fullName: string
  email: string
  phone: string
  segment: LeadSegmentId | ""
  companyName: string
  address: string
  zipCode: string
  city: string
  serviceIds: string[]
  service: ServiceId | ""
  platform: LeadPlatformId | ""
  metaAdId: string
  status: LeadStatusId
  salesPrice: number | null
  profit: number | null
  customFields: Record<string, unknown>
}>

export function leadRowToLead(row: LeadRow): Lead {
  const serviceLegacy = isServiceId(row.service_legacy) ? row.service_legacy : ""

  return {
    id: row.id,
    date: row.lead_date,
    time: row.lead_time ?? undefined,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    segment: isLeadSegmentId(row.segment) ? row.segment : "",
    companyName: row.company_name,
    address: row.address,
    zipCode: row.zip_code,
    city: row.city,
    serviceIds: row.service_ids ?? [],
    service: serviceLegacy,
    platform: isLeadPlatformId(row.platform) ? row.platform : "",
    metaAdId: row.meta_ad_id,
    metaFormId: row.meta_form_id ?? undefined,
    metaExtra: row.meta_extra ?? {},
    status: isLeadStatusId(row.status) ? row.status : "new_waiting_call",
    salesPrice: row.sales_price,
    profit: row.profit,
    source: row.source,
    lockedFields: row.locked_fields ?? [],
    customFields: row.custom_fields ?? {},
  }
}

export function isLeadFieldLocked(
  lead: Pick<Lead, "source" | "lockedFields">,
  field: keyof LeadPatch
): boolean {
  if (lead.source !== "meta") return false
  return META_LOCKED_FIELDS.includes(field as (typeof META_LOCKED_FIELDS)[number])
}

export function leadPatchToRow(
  patch: LeadPatch
): Partial<
  Pick<
    LeadRow,
    | "lead_date"
    | "lead_time"
    | "full_name"
    | "email"
    | "phone"
    | "segment"
    | "company_name"
    | "address"
    | "zip_code"
    | "city"
    | "service_ids"
    | "service_legacy"
    | "platform"
    | "meta_ad_id"
    | "status"
    | "sales_price"
    | "profit"
    | "custom_fields"
  >
> {
  const next: Partial<LeadRow> = {}

  if (patch.date !== undefined) next.lead_date = patch.date
  if (patch.time !== undefined) next.lead_time = patch.time
  if (patch.fullName !== undefined) next.full_name = patch.fullName
  if (patch.email !== undefined) next.email = patch.email
  if (patch.phone !== undefined) next.phone = patch.phone
  if (patch.segment !== undefined) next.segment = patch.segment
  if (patch.companyName !== undefined) next.company_name = patch.companyName
  if (patch.address !== undefined) next.address = patch.address
  if (patch.zipCode !== undefined) next.zip_code = patch.zipCode
  if (patch.city !== undefined) next.city = patch.city
  if (patch.serviceIds !== undefined) next.service_ids = patch.serviceIds
  if (patch.service !== undefined) next.service_legacy = patch.service
  if (patch.platform !== undefined) next.platform = patch.platform
  if (patch.metaAdId !== undefined) next.meta_ad_id = patch.metaAdId
  if (patch.status !== undefined) next.status = patch.status
  if (patch.salesPrice !== undefined) next.sales_price = patch.salesPrice
  if (patch.profit !== undefined) next.profit = patch.profit
  if (patch.customFields !== undefined) next.custom_fields = patch.customFields

  return next
}

export function leadToInsertRow(
  lead: Lead,
  organizationId: string,
  source: LeadRow["source"] = "demo",
  /** Stable external identity (unique per organization); enables duplicate protection. */
  legacyId?: string | null
): Omit<LeadRow, "created_at" | "updated_at"> {
  return {
    id: lead.id.includes("-") && lead.id.length === 36 ? lead.id : randomUUID(),
    organization_id: organizationId,
    legacy_id: legacyId ?? (lead.id.startsWith("lead-") ? lead.id : null),
    lead_date: lead.date,
    lead_time: lead.time ?? null,
    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment,
    company_name: lead.companyName,
    address: lead.address,
    zip_code: lead.zipCode,
    city: lead.city,
    service_ids: lead.serviceIds,
    service_legacy: lead.service ?? "",
    platform: lead.platform,
    meta_ad_id: lead.metaAdId,
    status: lead.status,
    sales_price: lead.salesPrice,
    profit: lead.profit,
    source,
    locked_fields: source === "meta" ? [...META_LOCKED_FIELDS] : [],
    meta_form_id: lead.metaFormId ?? null,
    meta_extra: lead.metaExtra ?? {},
    custom_fields: lead.customFields ?? {},
    import_id: null,
  }
}

export function filterPatchForLockedLead(patch: LeadPatch, row: LeadRow): LeadPatch {
  if (row.source !== "meta") return patch

  const lead = leadRowToLead(row)
  const alwaysAllowed = new Set([
    "serviceIds",
    "service",
    "status",
    "salesPrice",
    "profit",
    "customFields",
  ])
  const next: LeadPatch = {}

  for (const [key, value] of Object.entries(patch) as [
    keyof LeadPatch,
    LeadPatch[keyof LeadPatch],
  ][]) {
    if (value === undefined) continue
    if (alwaysAllowed.has(key)) {
      ;(next as Record<string, unknown>)[key] = value
      continue
    }
    // CRM users may correct fields Meta filled; a later Meta sync can still refresh them.
    if (
      META_LOCKED_FIELDS.includes(key as (typeof META_LOCKED_FIELDS)[number]) &&
      leadFieldHasValue(lead, key)
    ) {
      ;(next as Record<string, unknown>)[key] = value
    }
  }

  return next
}

export function isFieldLocked(row: LeadRow, field: keyof LeadPatch): boolean {
  if (row.source !== "meta") return false
  return META_LOCKED_FIELDS.includes(field as (typeof META_LOCKED_FIELDS)[number])
}
