import type { Lead } from "@/lib/leads"

/** The last 8 digits of a phone number (Danish national number), or null when too short to compare. */
export function phoneMatchKey(value: string): string | null {
  const digits = value.replace(/\D/g, "")
  if (digits.length < 6) return null
  return digits.slice(-8)
}

/** A lowercased email, or null when it is not comparable yet. */
export function emailMatchKey(value: string): string | null {
  const email = value.trim().toLowerCase()
  return email.includes("@") ? email : null
}

/** An existing lead with the same phone number (ignoring spacing and +45), if any. */
export function findLeadByPhone(
  leads: readonly Lead[],
  phone: string,
  ignoreId?: string
): Lead | null {
  const key = phoneMatchKey(phone)
  if (!key) return null
  return leads.find((lead) => lead.id !== ignoreId && phoneMatchKey(lead.phone) === key) ?? null
}

/** An existing lead with the same email (case-insensitive), if any. */
export function findLeadByEmail(
  leads: readonly Lead[],
  email: string,
  ignoreId?: string
): Lead | null {
  const key = emailMatchKey(email)
  if (!key) return null
  return leads.find((lead) => lead.id !== ignoreId && emailMatchKey(lead.email) === key) ?? null
}
