import type { LeadSegmentId } from "@/lib/leads"
import type { FieldMapping } from "@/lib/leads/inbound-payload"

/**
 * Danish column headers from the Scantherm B2B funnel sheet / Make payload
 * (scantherm-quick-heat-trailer.censio.dk). Adjust custom field keys if the client sheet uses other keys.
 */
export const B2B_FUNNEL_DANISH_FIELD_MAPPING: FieldMapping = {
  leadDate: "Dato",
  fullName: "Fulde navn",
  email: "E-mail",
  phone: "Telefon",
  companyName: "Virksomheds navn",
  "customFields.note": "Note",
}

/** Smaller field picker in admin — only what the B2B funnel sends. */
export const B2B_FUNNEL_WEBHOOK_FIELD_TARGETS: readonly string[] = [
  "leadDate",
  "fullName",
  "email",
  "phone",
  "companyName",
  "customFields.note",
]

export type LeadFunnelAudience = "b2b" | "b2c"

export function leadFunnelCreateOptionsForAudience(audience: LeadFunnelAudience): {
  defaultSegment: LeadSegmentId | null
  fieldMapping: FieldMapping
  dataFormat: "ours" | "own"
  webhookFieldTargets: string[] | null
  sheetSourceLabel: string | null
} {
  if (audience === "b2b") {
    return {
      defaultSegment: "b2b",
      fieldMapping: { ...B2B_FUNNEL_DANISH_FIELD_MAPPING },
      dataFormat: "own",
      webhookFieldTargets: [...B2B_FUNNEL_WEBHOOK_FIELD_TARGETS],
      sheetSourceLabel: "Quick-Heat Trailer",
    }
  }
  return {
    defaultSegment: null,
    fieldMapping: {},
    dataFormat: "ours",
    webhookFieldTargets: null,
    sheetSourceLabel: null,
  }
}
