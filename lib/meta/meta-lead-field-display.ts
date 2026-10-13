import type { MetaFieldData } from "@/lib/meta/lead-mapper"

const COLUMN_PRIORITY = [
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone_number",
  "phone",
  "company_name",
  "street_address",
  "address",
  "city",
  "zip_code",
  "post_code",
] as const

/**
 * Meta instant forms use English standard keys or Danish/custom question slugs.
 * Applied for every organization (not per client) in preview + cache reads.
 */
const DISPLAY_FIELD_ALIASES: Record<string, string[]> = {
  full_name: ["fulde_navn", "navn", "name", "fornavn"],
  email: ["e-mail", "mail", "work_email"],
  phone: ["phone_number", "telefon", "mobile_phone"],
  company_name: ["virksomhed", "company"],
  street_address: ["vejnavn", "adresse"],
  address: ["vejnavn", "adresse"],
  city: ["by", "hvilken_by_bor_du_i?"],
  post_code: ["postnummer", "postnr", "hvad_er_dit_postnummer"],
  zip_code: ["postnummer", "postnr", "hvad_er_dit_postnummer"],
}

function readAliasValue(fields: Record<string, string>, aliases: string[]): string {
  for (const key of aliases) {
    const direct = fields[key]
    if (direct?.trim()) return direct.trim()
    const lower = key.toLowerCase()
    for (const [name, value] of Object.entries(fields)) {
      if (name.toLowerCase() === lower && value.trim()) return value.trim()
    }
  }
  return ""
}

function deleteFieldKeyIgnoreCase(fields: Record<string, string>, key: string) {
  const lower = key.toLowerCase()
  for (const name of Object.keys(fields)) {
    if (name.toLowerCase() === lower) delete fields[name]
  }
}

/** Drop alias / duplicate columns so the 90-day table does not show Name or Email twice. */
function stripRedundantDisplayFieldKeys(fields: Record<string, string>): void {
  const canonicalValue = (canonical: string): string => {
    const lower = canonical.toLowerCase()
    for (const [name, value] of Object.entries(fields)) {
      if (name.toLowerCase() === lower && value.trim()) return value.trim()
    }
    return ""
  }

  if (canonicalValue("full_name")) {
    for (const key of [
      "fulde_navn",
      "navn",
      "name",
      "fornavn",
      "efternavn",
      "first_name",
      "last_name",
    ]) {
      deleteFieldKeyIgnoreCase(fields, key)
    }
  }

  for (const [canonical, aliases] of Object.entries(DISPLAY_FIELD_ALIASES)) {
    if (!canonicalValue(canonical)) continue
    for (const alias of aliases) deleteFieldKeyIgnoreCase(fields, alias)
  }

  if (fields.street_address?.trim()) {
    deleteFieldKeyIgnoreCase(fields, "address")
    deleteFieldKeyIgnoreCase(fields, "vejnavn")
    deleteFieldKeyIgnoreCase(fields, "adresse")
  }
  if (fields.post_code?.trim()) {
    deleteFieldKeyIgnoreCase(fields, "zip_code")
    deleteFieldKeyIgnoreCase(fields, "postnummer")
    deleteFieldKeyIgnoreCase(fields, "postnr")
  } else if (fields.zip_code?.trim()) {
    deleteFieldKeyIgnoreCase(fields, "post_code")
    deleteFieldKeyIgnoreCase(fields, "postnummer")
    deleteFieldKeyIgnoreCase(fields, "postnr")
  }
  if (fields.phone?.trim()) {
    deleteFieldKeyIgnoreCase(fields, "phone_number")
    deleteFieldKeyIgnoreCase(fields, "telefon")
    deleteFieldKeyIgnoreCase(fields, "mobile_phone")
  }
}

/** Merge Danish / custom Meta keys into canonical columns used by the leads check table. */
export function normalizeMetaLeadDisplayFields(
  fields: Record<string, string>
): Record<string, string> {
  const out = { ...fields }
  for (const [canonical, aliases] of Object.entries(DISPLAY_FIELD_ALIASES)) {
    if (out[canonical]?.trim()) continue
    const value = readAliasValue(out, aliases)
    if (value) out[canonical] = value
  }
  const first = readAliasValue(out, ["first_name", "fornavn"])
  const last = readAliasValue(out, ["last_name", "efternavn"])
  if (!out.full_name?.trim() && (first || last)) {
    out.full_name = [first, last].filter(Boolean).join(" ")
  }
  stripRedundantDisplayFieldKeys(out)
  return out
}

export function flattenMetaFieldData(fieldData?: MetaFieldData[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fieldData ?? []) {
    const name = String(field.name || "").trim()
    if (!name) continue
    const value = field.values?.[0]
    if (value == null) continue
    const trimmed = String(value).trim()
    if (trimmed) out[name] = trimmed
  }
  return normalizeMetaLeadDisplayFields(out)
}

const ALIAS_KEYS_HIDDEN_WHEN_CANONICAL_PRESENT = new Set(
  Object.values(DISPLAY_FIELD_ALIASES)
    .flat()
    .map((k) => k.toLowerCase())
)

export function collectMetaLeadDisplayColumns(leads: Array<{ fields: Record<string, string> }>): string[] {
  const keys = new Set<string>()
  for (const lead of leads) {
    for (const key of Object.keys(lead.fields)) keys.add(key)
  }
  const hasCanonical = (name: string) => {
    const lower = name.toLowerCase()
    for (const key of keys) {
      if (key.toLowerCase() === lower) return true
    }
    return false
  }
  const ordered: string[] = []
  for (const key of COLUMN_PRIORITY) {
    if (keys.has(key)) ordered.push(key)
  }
  const rest = [...keys]
    .filter((k) => {
      if (ordered.includes(k)) return false
      const lower = k.toLowerCase()
      if (!ALIAS_KEYS_HIDDEN_WHEN_CANONICAL_PRESENT.has(lower)) return true
      if (lower === "fulde_navn" && hasCanonical("full_name")) return false
      if (lower === "e-mail" && hasCanonical("email")) return false
      if ((lower === "vejnavn" || lower === "adresse") && hasCanonical("street_address")) {
        return false
      }
      if ((lower === "by") && hasCanonical("city")) return false
      return true
    })
    .sort((a, b) => a.localeCompare(b))
  return [...ordered, ...rest]
}

/** Human-readable table header for Meta field_data names. */
export function metaLeadFieldColumnLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    full_name: "Name",
    fulde_navn: "Name",
    first_name: "First name",
    last_name: "Last name",
    email: "Email",
    phone_number: "Phone",
    phone: "Phone",
    company_name: "Company",
    street_address: "Address",
    address: "Address",
    city: "City",
    zip_code: "ZIP",
    post_code: "Post code",
  }
  if (labels[fieldKey]) return labels[fieldKey]
  return fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
