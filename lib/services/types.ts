/** A service in the global library. `slug` is what leads store in `service_ids`; it never changes. */
export type Service = {
  id: string
  slug: string
  nameDa: string
  nameEn: string
  sortIndex: number
}

/** A service a client offers, with where it came from. Safe to send to the client dashboard. */
export type ClientService = {
  /** The slug (stored on leads). */
  id: string
  nameDa: string
  nameEn: string
  /** `category` = part of one of the client's category sets, `manual` = picked from elsewhere. */
  source: "category" | "manual"
  /** Names of the assigned categories that include this service (for the admin pills). */
  categoryNames: { da: string; en: string }[]
}

export const SERVICE_NAME_MAX = 80

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

/** Keeps only valid, unique uuid strings from untrusted input; returns null if not an array. */
export function parseUuidList(value: unknown, max = 500): string[] | null {
  if (!Array.isArray(value)) return null
  const out: string[] = []
  for (const item of value) {
    if (!isUuid(item)) return null
    if (!out.includes(item)) out.push(item)
    if (out.length > max) return null
  }
  return out
}

/** Display name in the given language (falls back to Danish, which is always set). */
export function serviceName(
  service: { nameDa: string; nameEn: string },
  locale: "da" | "en"
): string {
  return locale === "en" ? service.nameEn.trim() || service.nameDa : service.nameDa
}
