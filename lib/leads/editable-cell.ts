export type EditableCellKind = "text" | "number" | "date" | "time"

export type EditResult = { ok: true; value: string | number | null } | { ok: false }

/** What a cell shows while it is not being edited. */
export function editableDisplayText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  return typeof value === "string" ? value : ""
}

/**
 * Turns what was typed into the value to save. Text is kept as typed; a number column accepts
 * "12,5" as 12.5 and an empty box as "no value". Anything that is not a number is rejected, so
 * the cell goes back to what it had.
 */
export function parseEditedValue(kind: EditableCellKind, draft: string): EditResult {
  if (kind !== "number") return { ok: true, value: draft }
  const trimmed = draft.trim()
  if (trimmed === "") return { ok: true, value: null }
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".")
  if (!/^-?\d*\.?\d+$/.test(normalized)) return { ok: false }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false }
}

/** True when saving would change nothing (so no request is sent). */
export function isUnchangedEdit(current: unknown, next: string | number | null): boolean {
  if (next === null) return editableDisplayText(current) === ""
  return typeof next === "number" ? current === next : editableDisplayText(current) === next
}
