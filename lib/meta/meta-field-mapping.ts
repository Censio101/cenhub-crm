import type { MetaFieldData } from "@/lib/meta/lead-mapper"

/** Canonical CRM field → Meta question key (stored in meta_lead_forms.field_mapping). */
export type MetaFieldMapping = Record<string, string>

export const META_MAPPABLE_CANONICAL_FIELDS = [
  "fullName",
  "email",
  "phone",
  "companyName",
  "address",
  "zipCode",
  "city",
  "metaAdId",
] as const

export type MetaMappableCanonicalField = (typeof META_MAPPABLE_CANONICAL_FIELDS)[number]

/** Mapping targets starting with this prefix fill a custom lead sheet column (`custom:<fieldKey>`). */
export const META_CUSTOM_TARGET_PREFIX = "custom:"

export function metaCustomTarget(fieldKey: string): string {
  return `${META_CUSTOM_TARGET_PREFIX}${fieldKey}`
}

export function isMetaFieldMappingConfigured(mapping: MetaFieldMapping): boolean {
  return Object.values(mapping).some((v) => String(v || "").trim().length > 0)
}

export function validateMetaFieldMappingForEnable(mapping: MetaFieldMapping): {
  ok: boolean
  code?: "mapping_name_required" | "mapping_contact_required"
} {
  const nameKey = String(mapping.fullName || "").trim()
  const emailKey = String(mapping.email || "").trim()
  const phoneKey = String(mapping.phone || "").trim()
  if (!nameKey) {
    return { ok: false, code: "mapping_name_required" }
  }
  if (!emailKey && !phoneKey) {
    return { ok: false, code: "mapping_contact_required" }
  }
  return { ok: true }
}

export function emptyMappedLeadFields(metaAdIdFromLead?: string): MetaMappedLeadFields {
  return {
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    metaAdId: metaAdIdFromLead?.trim() ?? "",
    metaExtra: {},
    customRaw: {},
  }
}

export type MetaMappedLeadFields = {
  fullName: string
  email: string
  phone: string
  companyName: string
  address: string
  zipCode: string
  city: string
  metaAdId: string
  metaExtra: Record<string, string>
  /** Answers mapped to custom lead sheet columns, keyed by field key (still unvalidated text). */
  customRaw: Record<string, string>
}

function fieldValue(fields: MetaFieldData[], key: string): string {
  const normalized = key.toLowerCase()
  for (const field of fields) {
    if (String(field.name || "").toLowerCase() !== normalized) continue
    const value = field.values?.[0]
    if (value) return String(value).trim()
  }
  return ""
}

function readWithAliases(fields: MetaFieldData[], keys: string[]): string {
  for (const key of keys) {
    const value = fieldValue(fields, key)
    if (value) return value
  }
  return ""
}

const DEFAULT_ALIASES: Record<string, string[]> = {
  fullName: ["full_name", "navn", "name", "fornavn"],
  email: ["email", "e-mail", "mail", "work_email"],
  phone: ["phone_number", "phone", "telefon", "mobile_phone"],
  companyName: ["company_name", "virksomhed", "company"],
  address: ["street_address", "address", "adresse", "hvad_er_din_fulde_adresse"],
  zipCode: ["zip_code", "post_code", "postnummer", "postnr", "hvad_er_dit_postnummer"],
  city: ["city", "by", "hvilken_by_bor_du_i?"],
}

function defaultMapped(
  fields: MetaFieldData[]
): Omit<MetaMappedLeadFields, "metaExtra" | "metaAdId" | "customRaw"> {
  const first = readWithAliases(fields, ["first_name", "fornavn"])
  const last = readWithAliases(fields, ["last_name", "efternavn"])
  const fullName =
    readWithAliases(fields, DEFAULT_ALIASES.fullName) ||
    [first, last].filter(Boolean).join(" ")

  return {
    fullName,
    email: readWithAliases(fields, DEFAULT_ALIASES.email),
    phone: readWithAliases(fields, DEFAULT_ALIASES.phone),
    companyName: readWithAliases(fields, DEFAULT_ALIASES.companyName),
    address: readWithAliases(fields, DEFAULT_ALIASES.address),
    zipCode: readWithAliases(fields, DEFAULT_ALIASES.zipCode),
    city: readWithAliases(fields, DEFAULT_ALIASES.city),
  }
}

export function applyMetaFieldMapping(
  fields: MetaFieldData[],
  mapping: MetaFieldMapping,
  metaAdIdFromLead?: string
): MetaMappedLeadFields {
  const hasExplicitMapping = Object.values(mapping).some((v) => String(v || "").trim())
  const mappedKeysUsed = new Set<string>()
  const result: MetaMappedLeadFields = hasExplicitMapping
    ? emptyMappedLeadFields(metaAdIdFromLead)
    : {
        ...defaultMapped(fields),
        metaAdId: metaAdIdFromLead?.trim() ?? "",
        metaExtra: {},
        customRaw: {},
      }

  for (const [canonical, metaKey] of Object.entries(mapping)) {
    if (!metaKey?.trim()) continue
    const value = fieldValue(fields, metaKey.trim())
    mappedKeysUsed.add(metaKey.trim().toLowerCase())
    if (!value) continue
    if (canonical.startsWith(META_CUSTOM_TARGET_PREFIX)) {
      const key = canonical.slice(META_CUSTOM_TARGET_PREFIX.length)
      if (key) result.customRaw[key] = value
      continue
    }
    switch (canonical) {
      case "fullName":
        result.fullName = value
        break
      case "email":
        result.email = value
        break
      case "phone":
        result.phone = value
        break
      case "companyName":
        result.companyName = value
        break
      case "address":
        result.address = value
        break
      case "zipCode":
        result.zipCode = value
        break
      case "city":
        result.city = value
        break
      case "metaAdId":
        result.metaAdId = value
        break
      default:
        result.metaExtra[canonical] = value
        break
    }
  }

  for (const field of fields) {
    const name = String(field.name || "").trim()
    if (!name) continue
    if (mappedKeysUsed.has(name.toLowerCase())) continue
    const value = field.values?.[0]
    if (!value) continue
    if (hasExplicitMapping) {
      result.metaExtra[name] = String(value).trim()
      continue
    }
    const alreadyInCanonical = Object.values(DEFAULT_ALIASES).some((aliases) =>
      aliases.some((a) => a.toLowerCase() === name.toLowerCase())
    )
    if (alreadyInCanonical) continue
    result.metaExtra[name] = String(value).trim()
  }

  if (!hasExplicitMapping && !result.fullName.trim()) {
    if (result.email) {
      result.fullName = result.email.split("@")[0] || "Meta lead"
    } else if (result.phone) {
      result.fullName = "Meta lead"
    }
  }

  return result
}
