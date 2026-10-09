/** Semicolon-separated CSV with a UTF-8 BOM, so Danish Excel opens the file correctly. */

function escapeCell(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map((cell) => escapeCell(cell ?? "")).join(";")),
  ]
  return `\uFEFF${lines.join("\r\n")}`
}

/** A custom-field value as plain text (image links become their URL). */
export function plainCell(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url
    return typeof url === "string" ? url : ""
  }
  return ""
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
