export const SESSION_STATUS_FIELD_KEY = "session_status"

export function isSessionStatusFieldKey(fieldKey: string): boolean {
  return fieldKey.trim().toLowerCase() === SESSION_STATUS_FIELD_KEY
}

function normalizeToken(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase()
}

/** True when the stored value means the funnel session was abandoned. */
export function isSessionStatusAbandoned(raw: unknown): boolean {
  const s = normalizeToken(raw)
  if (!s) return false
  if (["ja", "yes", "true", "1", "abandoned", "afbrudt"].includes(s)) return true
  if (s.includes("abandon") || s.includes("afbrud")) return true
  return false
}

/** Sheet / export label: Abandoned vs Nej (default when empty or completed). */
export function formatSessionStatusDisplay(raw: unknown): string {
  if (isSessionStatusAbandoned(raw)) return "Abandoned"
  return "Nej"
}

/** Canonical value persisted on leads (`abandoned` | `nej`). Empty clears the field. */
export function normalizeSessionStatusStoredValue(raw: unknown): "abandoned" | "nej" | null {
  if (raw == null || raw === "") return null
  if (isSessionStatusAbandoned(raw)) return "abandoned"
  return "nej"
}

export function normalizeSessionStatusInCustomFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(fields, SESSION_STATUS_FIELD_KEY)) return fields
  const raw = fields[SESSION_STATUS_FIELD_KEY]
  const normalized = normalizeSessionStatusStoredValue(raw)
  if (normalized === null) {
    const next = { ...fields }
    delete next[SESSION_STATUS_FIELD_KEY]
    return next
  }
  if (raw === normalized) return fields
  return { ...fields, [SESSION_STATUS_FIELD_KEY]: normalized }
}

/** Match select options when stored values differ (e.g. `abandoned` vs option `Ja`). */
export function sessionStatusValuesEqual(a: unknown, b: unknown): boolean {
  if (normalizeToken(a) === normalizeToken(b)) return true
  if (isSessionStatusAbandoned(a) && isSessionStatusAbandoned(b)) return true
  if (!isSessionStatusAbandoned(a) && !isSessionStatusAbandoned(b)) return true
  return false
}
