/**
 * Field keys identify a custom column in the backend, webhooks and stored lead data
 * (`customFields.<key>`). They are always plain English-safe identifiers, independent of
 * the (possibly Danish) column label, and never change after the column is created.
 */

export const FIELD_KEY_MAX_LENGTH = 48

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,47}$/

/** Keys that would clash with object internals or with built-in field names. */
const RESERVED_FIELD_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  // Names of built-in / webhook fields (kept in sync with the database check constraint).
  "date",
  "email",
  "phone",
  "segment",
  "address",
  "city",
  "status",
  "profit",
  "platform",
])

/** Letters that Unicode decomposition does not split into base + accent. */
const TRANSLITERATION: Record<string, string> = {
  æ: "ae",
  ø: "oe",
  å: "aa",
  œ: "oe",
  ß: "ss",
  ð: "d",
  þ: "th",
  đ: "d",
  ł: "l",
}

export function isValidFieldKey(key: string): boolean {
  return FIELD_KEY_PATTERN.test(key) && !RESERVED_FIELD_KEYS.has(key)
}

/**
 * Turns a column label into a key suggestion (`Størrelse` -> `stoerrelse`).
 * Returns an empty string when nothing usable remains (for example a label of only symbols).
 */
export function suggestFieldKey(label: string): string {
  let out = ""
  for (const ch of label.toLowerCase()) out += TRANSLITERATION[ch] ?? ch

  out = out
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (/^\d/.test(out)) out = `f_${out}`
  out = out.slice(0, FIELD_KEY_MAX_LENGTH).replace(/_+$/g, "")
  return out.length >= 2 ? out : ""
}

/**
 * Returns `base` if it is valid and free, otherwise the first free `base_2`, `base_3`, ...
 * An empty or unusable base falls back to `column`.
 */
export function uniqueFieldKey(base: string, taken: ReadonlySet<string>): string {
  const root = isValidFieldKey(base) ? base : suggestFieldKey(base) || "column"
  if (isValidFieldKey(root) && !taken.has(root)) return root

  for (let suffix = 2; ; suffix += 1) {
    const tail = `_${suffix}`
    const candidate = `${root.slice(0, FIELD_KEY_MAX_LENGTH - tail.length)}${tail}`
    if (isValidFieldKey(candidate) && !taken.has(candidate)) return candidate
  }
}

/** Thrown when an explicitly requested field key is invalid or already in use. */
export class FieldKeyError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "taken"
  ) {
    super(message)
    this.name = "FieldKeyError"
  }
}
