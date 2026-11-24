/**
 * Reads plain text that follows a simple pattern so the CRM can show it nicely:
 *
 *   FLYTTER FRA                  <- heading: capital letters on a line of its own, at a block start
 *   Adresse: Vej 1, 4400 Kalundborg   <- row: "Label: value"
 *   Bolig: Lejlighed, 2. sal
 *   (blank line)
 *   OM BOLIGEN
 *   Bemærkninger: first line
 *   second line of the same note     <- continues the row above
 *
 * Only text is produced (never HTML), and the stored text is not changed.
 */

export type StructuredBlock =
  | { kind: "heading"; text: string }
  | { kind: "row"; label: string; value: string }
  | { kind: "text"; text: string }

export type StructuredText = {
  blocks: StructuredBlock[]
  rowCount: number
  headingCount: number
  /** True when the text looks like details worth showing as a list (not just free writing). */
  isStructured: boolean
}

const HEADING_MAX = 60
const LABEL_MAX = 40
const LABEL_MAX_WORDS = 5

function isHeading(line: string): boolean {
  if (line.length > HEADING_MAX || line.endsWith(":") || line.includes(": ")) return false
  const letters = line.replace(/[^\p{L}]/gu, "")
  if (letters.length < 2) return false
  return line === line.toLocaleUpperCase("da") && line !== line.toLocaleLowerCase("da")
}

/** "Label: value" (the colon must be followed by a space or end the line, so URLs and times are safe). */
function parseRow(line: string): { label: string; value: string } | null {
  const match = new RegExp(`^([^:]{1,${LABEL_MAX}}?):(?:[ \\t]+(.*))?$`, "u").exec(line)
  if (!match) return null
  const label = match[1].trim()
  if (!/\p{L}/u.test(label)) return null
  if (label.split(/\s+/).length > LABEL_MAX_WORDS) return null
  return { label, value: (match[2] ?? "").trim() }
}

export function parseStructuredText(input: string): StructuredText {
  const lines = input.replace(/\r\n?/g, "\n").split("\n")
  const blocks: StructuredBlock[] = []
  let currentRow: Extract<StructuredBlock, { kind: "row" }> | null = null
  let atBlockStart = true

  for (const raw of lines) {
    const line = raw.trim()
    if (line === "") {
      currentRow = null
      atBlockStart = true
      continue
    }
    if (atBlockStart && isHeading(line)) {
      blocks.push({ kind: "heading", text: line })
      currentRow = null
      atBlockStart = true
      continue
    }
    atBlockStart = false

    const row = parseRow(line)
    if (row) {
      currentRow = { kind: "row", label: row.label, value: row.value }
      blocks.push(currentRow)
      continue
    }
    if (currentRow) {
      // A line that is not "Label: value" continues the value above it.
      currentRow.value = currentRow.value ? `${currentRow.value}\n${line}` : line
      continue
    }
    blocks.push({ kind: "text", text: line })
  }

  const rowCount = blocks.filter((block) => block.kind === "row").length
  const headingCount = blocks.filter((block) => block.kind === "heading").length
  return {
    blocks,
    rowCount,
    headingCount,
    isStructured: rowCount >= 2 || (headingCount >= 1 && rowCount >= 1),
  }
}
