import type { CellValue, ColumnMapping, ImportOptions, ImportRowInput } from "@/lib/import/types"
import { IMPORT_CHUNK_SIZE } from "@/lib/import/types"
import { isLeadStatusId } from "@/lib/leads"

const PLATFORMS = new Set(["", "meta", "website", "landing"])
const MAX_COLUMNS = 200
const MAX_TARGETS = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export type ParsedImportRequest = {
  importId: string | null
  dryRun: boolean
  rows: ImportRowInput[]
  mapping: ColumnMapping
  options: ImportOptions
  previewCount: number
}

/** Checks the body of a batch request; the server never trusts what the browser sends. */
export function parseImportRequest(
  body: unknown
): { ok: true; value: ParsedImportRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Invalid request" }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return { ok: false, error: "No rows to process" }
  }
  if (body.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `At most ${IMPORT_CHUNK_SIZE} rows per request` }
  }

  const rows: ImportRowInput[] = []
  for (const raw of body.rows) {
    if (!isRecord(raw) || !isRecord(raw.values)) return { ok: false, error: "Invalid row" }
    const rowNumber = Number(raw.rowNumber)
    if (!Number.isInteger(rowNumber) || rowNumber < 1)
      return { ok: false, error: "Invalid row number" }
    const entries = Object.entries(raw.values)
    if (entries.length > MAX_COLUMNS) return { ok: false, error: "Too many columns" }
    const values: Record<string, CellValue> = {}
    for (const [key, value] of entries) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        values[key] = typeof value === "string" ? value.slice(0, 2000) : value
      } else {
        return { ok: false, error: "Cells must be text, numbers, yes/no or empty" }
      }
    }
    rows.push({ rowNumber, values, fileDuplicate: raw.fileDuplicate === true })
  }

  if (!isRecord(body.mapping)) return { ok: false, error: "Invalid mapping" }
  const mapping: ColumnMapping = {}
  const targets = Object.entries(body.mapping)
  if (targets.length > MAX_TARGETS) return { ok: false, error: "Invalid mapping" }
  for (const [target, columns] of targets) {
    if (!Array.isArray(columns) || columns.length === 0 || columns.length > 4) continue
    if (!columns.every((c) => typeof c === "string" && c.length > 0 && c.length <= 200)) {
      return { ok: false, error: "Invalid mapping" }
    }
    mapping[target] = columns as string[]
  }

  if (!isRecord(body.options)) return { ok: false, error: "Invalid options" }
  const { defaultStatus, defaultPlatform, skipDuplicates } = body.options
  if (typeof defaultStatus !== "string" || !isLeadStatusId(defaultStatus)) {
    return { ok: false, error: "Invalid default status" }
  }
  if (typeof defaultPlatform !== "string" || !PLATFORMS.has(defaultPlatform)) {
    return { ok: false, error: "Invalid default source" }
  }

  const dryRun = body.dryRun !== false
  const importId = typeof body.importId === "string" && body.importId ? body.importId : null
  if (!dryRun && !importId) return { ok: false, error: "An import id is required" }

  const previewCount = Math.min(Math.max(Math.trunc(Number(body.previewCount) || 0), 0), 100)

  return {
    ok: true,
    value: {
      importId,
      dryRun,
      rows,
      mapping,
      options: {
        defaultStatus,
        defaultPlatform: defaultPlatform as ImportOptions["defaultPlatform"],
        skipDuplicates: skipDuplicates !== false,
      },
      previewCount,
    },
  }
}
