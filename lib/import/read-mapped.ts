import { cellText, hasValue } from "@/lib/import/parse-values"
import type { CellValue, ColumnMapping, ImportRowValues } from "@/lib/import/types"

/** Reads a field from a row: the first filled column, or every filled column joined for names. */
export function readMapped(
  row: ImportRowValues,
  mapping: ColumnMapping,
  target: string
): CellValue {
  const columns = mapping[target] ?? []
  if (columns.length === 0) return null
  if (target === "fullName" && columns.length > 1) {
    const parts = columns.map((column) => cellText(row[column], 120)).filter(Boolean)
    return parts.length > 0 ? parts.join(" ") : null
  }
  for (const column of columns) {
    if (hasValue(row[column])) return row[column] ?? null
  }
  return null
}
