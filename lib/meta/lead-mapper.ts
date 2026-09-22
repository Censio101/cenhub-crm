import { randomUUID } from "node:crypto"

import { META_LOCKED_FIELDS } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"

export type MetaFieldData = {
  name: string
  values?: string[]
}

export type MetaLeadPayload = {
  id: string
  created_time?: string
  field_data?: MetaFieldData[]
  ad_id?: string
}

function readField(fields: MetaFieldData[], names: string[]): string {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()))
  for (const field of fields) {
    const key = String(field.name || "").toLowerCase()
    if (!normalizedNames.has(key)) continue
    const value = field.values?.[0]
    if (value) return String(value).trim()
  }
  return ""
}

function inferSegment(companyName: string): "" | "b2c" | "b2b" {
  return companyName.trim() ? "b2b" : "b2c"
}

function leadDateFromCreatedTime(createdTime?: string): string {
  if (!createdTime) return new Date().toISOString().slice(0, 10)
  const parsed = new Date(createdTime)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10)
  return parsed.toISOString().slice(0, 10)
}

export function mapMetaLeadToInsertRow(
  organizationId: string,
  lead: MetaLeadPayload
): Omit<LeadRow, "created_at" | "updated_at"> {
  const fields = lead.field_data ?? []
  const fullName =
    readField(fields, ["full_name", "navn", "name", "fornavn"]) ||
    [readField(fields, ["first_name", "fornavn"]), readField(fields, ["last_name", "efternavn"])]
      .filter(Boolean)
      .join(" ")
  const email = readField(fields, ["email", "e-mail", "mail"])
  const phone = readField(fields, ["phone_number", "phone", "telefon", "mobile_phone"])
  const companyName = readField(fields, ["company_name", "virksomhed", "company"])
  const address = readField(fields, ["street_address", "address", "adresse"])
  const zipCode = readField(fields, ["zip_code", "post_code", "postnummer", "postnr"])
  const city = readField(fields, ["city", "by"])

  return {
    id: randomUUID(),
    organization_id: organizationId,
    legacy_id: lead.id,
    lead_date: leadDateFromCreatedTime(lead.created_time),
    full_name: fullName,
    email,
    phone,
    segment: inferSegment(companyName),
    company_name: companyName,
    address,
    zip_code: zipCode,
    city,
    service_ids: [],
    service_legacy: "",
    platform: "meta",
    meta_ad_id: lead.ad_id ?? "",
    status: "new_waiting_call",
    sales_price: null,
    profit: null,
    source: "meta",
    locked_fields: [...META_LOCKED_FIELDS],
  }
}
