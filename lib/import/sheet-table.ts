import type { CellValue, ImportRowInput } from "@/lib/import/types"

/** A sheet as it was read: rows of cells, the header row is somewhere in it. */
export type SheetMatrix = CellValue[][]

function isEmptyRow(row: readonly CellValue[]): boolean {
  return row.every((cell) => cell === null || (typeof cell === "string" && cell.trim() === ""))
}

/** Column names from a header row: blanks become "Column 3", repeats become "Name (2)". */
export function headersFromRow(row: readonly CellValue[]): string[] {
  const seen = new Map<string, number>()
  return row.map((cell, index) => {
    const base = (cell === null ? "" : String(cell)).trim().slice(0, 100) || `Column ${index + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

/**
 * The sheet as a table: the header names and one object per data row. Empty rows are left out;
 * `rowNumber` is the row in the sheet (1 = first row) so messages can point at it.
 */
export function sheetTable(
  matrix: SheetMatrix,
  headerRow: number
): { headers: string[]; rows: ImportRowInput[] } {
  const headerIndex = Math.max(0, headerRow - 1)
  const headerCells = matrix[headerIndex]
  if (!headerCells) return { headers: [], rows: [] }

  // Trailing empty header cells are not columns.
  let width = headerCells.length
  while (width > 0 && isEmptyRow([headerCells[width - 1]])) width -= 1
  const headers = headersFromRow(headerCells.slice(0, width))

  const rows: ImportRowInput[] = []
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const cells = matrix[index]
    if (isEmptyRow(cells)) continue
    const values: Record<string, CellValue> = {}
    headers.forEach((header, column) => {
      const cell = cells[column]
      values[header] =
        cell === undefined || (typeof cell === "string" && cell.trim() === "") ? null : cell
    })
    rows.push({ rowNumber: index + 1, values })
  }
  return { headers, rows }
}
