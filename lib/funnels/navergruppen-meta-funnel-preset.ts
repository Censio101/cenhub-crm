import type { FieldMapping } from "@/lib/leads/inbound-payload"

/**
 * Make posts CRM field names (same JSON as fixed fields). Mapping is identity paths so
 * captured samples and path pickers still work when keys match.
 */
export const NAVERGRUPPEN_META_FIELD_MAPPING: FieldMapping = {
  fullName: "fullName",
  email: "email",
  phone: "phone",
  leadDate: "leadDate",
  companyName: "companyName",
  metaAdId: "metaAdId",
  externalId: "externalId",
  serviceIds: "serviceIds",
  platform: "platform",
  "customFields.b2b_b2c": "customFields.b2b_b2c",
}

export const NAVERGRUPPEN_META_SERVICE_ALIASES: readonly { alias: string; slug: string }[] = [
  { alias: "tag", slug: "tag" },
  { alias: "facade", slug: "facade" },
  { alias: "tag_&_facade", slug: "tag-facade" },
  { alias: "rådgivning", slug: "raadgivning" },
  { alias: "andet?", slug: "andet-2" },
]
