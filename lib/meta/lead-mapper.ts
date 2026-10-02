import { randomUUID } from "node:crypto"

import { META_LOCKED_FIELDS } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"
import { nowLeadDateTime } from "@/lib/leads/lead-datetime"
import { coerceWebhookCustomFields } from "@/lib/lead-sheet/webhook-custom-fields"
import { applyMetaFieldMapping, type MetaFieldMapping } from "@/lib/meta/meta-field-mapping"

export type MetaFieldData = {
  name: string
  values?: string[]
}

export type MetaLeadPayload = {
  id: string
  created_time?: string
  field_data?: MetaFieldData[]
  ad_id?: string
  form_id?: string
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

/** The lead's day and time from Meta's `created_time`, in the CRM's home timezone. */
function leadDateTimeFromCreatedTime(createdTime?: string): { date: string; time: string } {
  const parsed = createdTime ? new Date(createdTime) : new Date()
  return nowLeadDateTime(Number.isNaN(parsed.getTime()) ? new Date() : parsed)
}

export function mapMetaLeadToInsertRow(
  organizationId: string,
  lead: MetaLeadPayload,
  options: {
    fieldMapping?: MetaFieldMapping
    metaFormId?: string | null
    /** The client's custom lead sheet columns, for answers mapped with `custom:<key>`. */
    customFieldDefs?: LeadSheetCustomFieldDef[]
  } = {}
): Omit<LeadRow, "created_at" | "updated_at"> {
  const fields = lead.field_data ?? []
  const createdAt = leadDateTimeFromCreatedTime(lead.created_time)
  const mapped = applyMetaFieldMapping(fields, options.fieldMapping ?? {}, lead.ad_id)
  const fullName =
    mapped.fullName ||
    readField(fields, ["full_name", "navn", "name", "fornavn"]) ||
    [readField(fields, ["first_name", "fornavn"]), readField(fields, ["last_name", "efternavn"])]
      .filter(Boolean)
      .join(" ")
  const email = mapped.email || readField(fields, ["email", "e-mail", "mail"])
  const phone =
    mapped.phone || readField(fields, ["phone_number", "phone", "telefon", "mobile_phone"])
  const companyName =
    mapped.companyName || readField(fields, ["company_name", "virksomhed", "company"])
  const address = mapped.address || readField(fields, ["street_address", "address", "adresse"])
  const zipCode =
    mapped.zipCode || readField(fields, ["zip_code", "post_code", "postnummer", "postnr"])
  const city = mapped.city || readField(fields, ["city", "by"])

  return {
    id: randomUUID(),
    organization_id: organizationId,
    legacy_id: lead.id,
    lead_date: createdAt.date,
    lead_time: createdAt.time,
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
    meta_ad_id: mapped.metaAdId || lead.ad_id || "",
    status: "new_waiting_call",
    sales_price: null,
    profit: null,
    source: "meta",
    locked_fields: [...META_LOCKED_FIELDS],
    meta_form_id: options.metaFormId ?? lead.form_id ?? null,
    meta_extra: mapped.metaExtra ?? {},
    // Answers mapped to custom columns are coerced to each column's type; invalid ones are skipped.
    custom_fields: coerceWebhookCustomFields(mapped.customRaw, options.customFieldDefs ?? [])
      .values,
    import_id: null,
  }
}
