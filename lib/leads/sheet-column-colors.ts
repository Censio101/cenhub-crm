/**
 * Column colours for the lead and customer sheets (like colouring a column in Google Sheets).
 * Saved per user in the browser (see `StoredSheetLayout`), not in the database.
 */

export type SheetColumnColorId = "yellow" | "green" | "blue" | "rose" | "violet" | "stone"

export type SheetColumnColor = {
  id: SheetColumnColorId
  /** Soft, opaque tint for the cells (opaque so pinned columns do not show what scrolls under). */
  cell: string
  /** Stronger shade for the marker in the column header and the swatch in the menu. */
  marker: string
}

export const SHEET_COLUMN_COLORS: readonly SheetColumnColor[] = [
  { id: "yellow", cell: "#fff6d6", marker: "#e0b020" },
  { id: "green", cell: "#e4f3e6", marker: "#4fa36a" },
  { id: "blue", cell: "#e3eefb", marker: "#4a86d4" },
  { id: "rose", cell: "#fbe5e5", marker: "#d56a6a" },
  { id: "violet", cell: "#efe7fb", marker: "#8a6bd1" },
  { id: "stone", cell: "#ece8e3", marker: "#9a8f84" },
]

const BY_ID = new Map(SHEET_COLUMN_COLORS.map((color) => [color.id, color]))

export function sheetColumnColor(id: string | undefined): SheetColumnColor | null {
  return id ? (BY_ID.get(id as SheetColumnColorId) ?? null) : null
}

/** Column id -> colour id, as kept in the browser. */
export type SheetColumnColors = Record<string, SheetColumnColorId>

/** Reads the saved colours, dropping anything that is not a known colour (old or edited data). */
export function parseStoredColumnColors(value: unknown): SheetColumnColors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const result: SheetColumnColors = {}
  for (const [columnId, colorId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof colorId === "string" && BY_ID.has(colorId as SheetColumnColorId)) {
      result[columnId] = colorId as SheetColumnColorId
    }
  }
  return result
}

/** A new map with one column coloured, or uncoloured when `colorId` is null. */
export function withColumnColor(
  colors: SheetColumnColors,
  columnId: string,
  colorId: SheetColumnColorId | null
): SheetColumnColors {
  const next = { ...colors }
  if (colorId === null) delete next[columnId]
  else next[columnId] = colorId
  return next
}

/**
 * CSS that tints the body cells of the coloured columns.
 * `leadingCells` is how many cells come before the first data column (1 with the select box).
 * Only palette values and whole numbers go into the CSS, never saved text.
 * Status cells keep their own colour, and spacer rows of the virtual list are skipped.
 */
export function columnColorCss(
  colors: SheetColumnColors,
  columnIds: readonly string[],
  leadingCells: number
): string {
  const rules: string[] = []
  columnIds.forEach((columnId, index) => {
    const color = sheetColumnColor(colors[columnId])
    if (!color) return
    const nth = leadingCells + index + 1
    rules.push(
      `[data-lead-sheet-table] > tbody > tr:not([aria-hidden]) > td:nth-child(${nth}):not([data-lead-status-cell]){background-color:${color.cell}}`
    )
  })
  return rules.join("\n")
}
