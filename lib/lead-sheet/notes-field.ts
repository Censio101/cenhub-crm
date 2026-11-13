/** Label / key patterns that should use the sheet Notes editor (textarea). */
export function isNotesLikeFieldKey(fieldKey: string): boolean {
  const key = fieldKey.trim().toLowerCase()
  if (key === "note" || key === "notes" || key === "notat") return true
  return /^notes_\d+$/.test(key) || key.startsWith("notes_")
}

export function isNotesLikeLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return normalized === "note" || normalized === "notes" || normalized === "notat"
}

export function shouldUseNotesTextareaField(label: string, fieldKey: string): boolean {
  return isNotesLikeLabel(label) || isNotesLikeFieldKey(fieldKey)
}
