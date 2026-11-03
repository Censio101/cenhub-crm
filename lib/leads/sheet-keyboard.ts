/** Arrow-key movement between cells of the lead and customer sheets. */

export type SheetCellPosition = { row: number; col: number }

const ARROW_STEP: Record<string, { row: number; col: number }> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

/**
 * Where an arrow key moves from the current cell, or null when the key is not an arrow key
 * or the cell is already at that edge of the sheet.
 */
export function nextCellPosition(
  key: string,
  from: SheetCellPosition,
  rowCount: number,
  colCount: number
): SheetCellPosition | null {
  const step = ARROW_STEP[key]
  if (!step) return null
  const row = from.row + step.row
  const col = from.col + step.col
  if (row < 0 || col < 0 || row >= rowCount || col >= colCount) return null
  return { row, col }
}

/** What copying a cell puts on the clipboard: its text, with the empty-cell dash left out. */
export function cellTextForCopy(rawText: string): string {
  const text = rawText.replace(/\s+/g, " ").trim()
  return text === "–" || text === "-" ? "" : text
}
