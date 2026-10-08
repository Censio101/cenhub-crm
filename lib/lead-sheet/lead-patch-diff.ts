import type { LeadPatch } from "@/lib/db/lead-mapper"
import type { Lead } from "@/lib/leads"

const SCALAR_KEYS = [
  "date",
  "time",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "address",
  "zipCode",
  "city",
  "service",
  "platform",
  "metaAdId",
  "status",
  "salesPrice",
  "profit",
] as const satisfies readonly (keyof LeadPatch)[]

/** Columns that store NULL when emptied (numbers and the optional time); the rest store "". */
const NULLABLE_KEYS = new Set<string>(["time", "salesPrice", "profit"])

/** JSON text with object keys sorted, so `{a,b}` equals `{b,a}` (the database reorders keys). */
function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)))
      : v
  )
}

function sameJson(a: unknown, b: unknown): boolean {
  return stableJson(a) === stableJson(b)
}

/**
 * The fields of `next` that differ from `original`, as a PATCH body.
 * Only changed fields are sent so an edit never overwrites values it did not touch
 * (for example something a webhook updated while the popup was open).
 * Custom fields the user emptied are sent as `null`, which the server treats as "clear".
 */
export function buildLeadPatch(original: Lead, next: Lead): LeadPatch {
  const patch: Record<string, unknown> = {}

  for (const key of SCALAR_KEYS) {
    const before = original[key] ?? null
    const after = next[key] ?? null
    if (before !== after) patch[key] = next[key] ?? (NULLABLE_KEYS.has(key) ? null : "")
  }

  if (!sameJson(original.serviceIds ?? [], next.serviceIds ?? [])) {
    patch.serviceIds = next.serviceIds ?? []
  }

  const before = original.customFields ?? {}
  const after = next.customFields ?? {}
  const customPatch: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    if (!sameJson(before[key], after[key])) customPatch[key] = after[key]
  }
  for (const key of Object.keys(before)) {
    if (!(key in after) && before[key] != null && before[key] !== "") customPatch[key] = null
  }
  if (Object.keys(customPatch).length > 0) patch.customFields = customPatch

  return patch as LeadPatch
}

export function isEmptyLeadPatch(patch: LeadPatch): boolean {
  return Object.keys(patch).length === 0
}
