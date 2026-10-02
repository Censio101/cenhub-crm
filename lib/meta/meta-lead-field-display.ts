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
  return out
}

export function collectMetaLeadDisplayColumns(leads: Array<{ fields: Record<string, string> }>): string[] {
  const keys = new Set<string>()
  for (const lead of leads) {
    for (const key of Object.keys(lead.fields)) keys.add(key)
  }
  const ordered: string[] = []
  for (const key of COLUMN_PRIORITY) {
    if (keys.has(key)) ordered.push(key)
  }
  const rest = [...keys].filter((k) => !ordered.includes(k)).sort((a, b) => a.localeCompare(b))
  return [...ordered, ...rest]
}

/** Human-readable table header for Meta field_data names. */
export function metaLeadFieldColumnLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    full_name: "Name",
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
