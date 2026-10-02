import { escapePathSegment } from "@/lib/leads/source-path"

/**
 * Turns a captured webhook body into the list of values an admin can pick from when mapping,
 * and proposes a first mapping. Safe for browser and server.
 */

export type PayloadValueType = "string" | "number" | "boolean" | "null" | "list" | "object"

export type PayloadPath = {
  /** Path in the syntax `getByPath` reads (dots between keys, `\.` for a dot in a key). */
  path: string
  /** Short text of the value for the picker. */
  preview: string
  type: PayloadValueType
  /** The value is an empty string or null. */
  empty: boolean
  /** The path goes through a list position (`items.2.value`), so it breaks if the order changes. */
  positional: boolean
}

export const MAX_PAYLOAD_DEPTH = 6
export const MAX_PAYLOAD_PATHS = 300
const PREVIEW_LENGTH = 60

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/**
 * Every value in the body as a pickable path. Objects are walked, lists of plain values are one
 * entry (useful for services), lists of objects are walked by position. Capped in depth and
 * count; `truncated` says when entries were left out.
 */
export function flattenPayloadPaths(payload: unknown): {
  paths: PayloadPath[]
  truncated: boolean
} {
  const paths: PayloadPath[] = []
  let truncated = false

  function add(entry: PayloadPath) {
    if (paths.length >= MAX_PAYLOAD_PATHS) {
      truncated = true
      return
    }
    paths.push(entry)
  }

  function walk(value: unknown, prefix: string, depth: number, positional: boolean) {
    if (paths.length >= MAX_PAYLOAD_PATHS) {
      truncated = true
      return
    }
    if (Array.isArray(value)) {
      const allPlain = value.every((item) => item === null || typeof item !== "object")
      if (allPlain) {
        if (prefix) {
          add({
            path: prefix,
            preview: clip(value.map((item) => String(item ?? "")).join(", ")),
            type: "list",
            empty: value.length === 0,
            positional,
          })
        }
        return
      }
      if (depth >= MAX_PAYLOAD_DEPTH) {
        truncated = true
        return
      }
      value.forEach((item, index) =>
        walk(item, prefix ? `${prefix}.${index}` : String(index), depth + 1, true)
      )
      return
    }
    if (isPlainObject(value)) {
      if (depth >= MAX_PAYLOAD_DEPTH) {
        truncated = true
        return
      }
      for (const [key, child] of Object.entries(value)) {
        const segment = escapePathSegment(key)
        walk(child, prefix ? `${prefix}.${segment}` : segment, depth + 1, positional)
      }
      return
    }
    if (!prefix) return
    const type: PayloadValueType =
      value === null || value === undefined
        ? "null"
        : typeof value === "number"
          ? "number"
          : typeof value === "boolean"
            ? "boolean"
            : "string"
    const text = value === null || value === undefined ? "" : String(value)
    add({
      path: prefix,
      preview: clip(text),
      type,
      empty: text.trim() === "",
      positional,
    })
  }

  walk(payload, "", 0, false)
  return { paths, truncated }
}

/** Lower-case letters and digits only, so `Full_Name`, `full-name` and `fullName` compare equal. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
}

/** Names senders commonly use for each standard field, best match first. */
const STANDARD_ALIASES: Record<string, string[]> = {
  fullName: ["fullname", "name", "yourname", "contactname", "customername", "navn", "fuldenavn"],
  email: ["email", "emailaddress", "mail", "youremail", "epost", "emailadresse"],
  phone: [
    "phone",
    "phonenumber",
    "telephone",
    "tel",
    "mobile",
    "mobilenumber",
    "telefon",
    "tlf",
    "mobil",
  ],
  leadDate: ["leaddate", "date", "createdat", "created", "submittedat", "timestamp", "dato"],
  segment: ["segment", "customertype", "type"],
  serviceIds: ["serviceids", "services", "service", "ydelser", "ydelse"],
  platform: ["platform", "channel", "source"],
  companyName: ["companyname", "company", "organization", "organisation", "firma", "virksomhed"],
  address: ["address", "streetaddress", "street", "adresse", "vej"],
  zipCode: ["zipcode", "zip", "postalcode", "postcode", "postnummer", "postnr"],
  city: ["city", "town", "by"],
  metaAdId: ["metaadid", "adid"],
  externalId: ["externalid", "submissionid", "responseid", "leadid", "id"],
}

export type MappingTarget = {
  /** Mapping key: `fullName` or `customFields.<key>`. */
  target: string
  /** Extra names to try, e.g. a custom column's key and label. */
  names?: string[]
}

/**
 * A first guess at the mapping: for each target, the path whose last key matches one of its
 * names. Each path is used once, text targets never get lists or objects, and only
 * `serviceIds` takes a list.
 */
export function suggestMappings(
  paths: readonly PayloadPath[],
  targets: readonly MappingTarget[]
): Record<string, string> {
  const result: Record<string, string> = {}
  const used = new Set<string>()

  const lastKey = (path: string) => {
    const segments = path.split(/(?<!\\)\./)
    return normalizeName(segments[segments.length - 1] ?? "")
  }
  const candidates = paths.map((entry) => ({ entry, key: lastKey(entry.path) }))

  for (const { target, names = [] } of targets) {
    const wanted = [...(STANDARD_ALIASES[target] ?? []), ...names.map(normalizeName)].filter(
      Boolean
    )
    const listOk = target === "serviceIds"
    for (const alias of wanted) {
      const match = candidates.find(
        ({ entry, key }) =>
          key === alias &&
          !used.has(entry.path) &&
          (listOk ? true : entry.type !== "list") &&
          (!listOk ? true : entry.type === "list" || entry.type === "string")
      )
      if (match) {
        result[target] = match.entry.path
        used.add(match.entry.path)
        break
      }
    }
  }
  return result
}
