import Papa from "papaparse"

import type { SheetMatrix } from "@/lib/import/sheet-table"
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, type CellValue } from "@/lib/import/types"

export type ParsedSheet = { name: string; matrix: SheetMatrix }
export type ParsedFile = { fileName: string; size: number; sheets: ParsedSheet[] }

export type ImportFileErrorCode =
  "too_large" | "too_many_rows" | "unsupported" | "xls_unsupported" | "empty" | "unreadable"

export class ImportFileError extends Error {
  constructor(readonly code: ImportFileErrorCode) {
    super(code)
    this.name = "ImportFileError"
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

/** A real Excel date as text: `2026-03-24`, or `2026-03-24 14:30` when it has a time. */
function dateToText(date: Date): string {
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  return hours === 0 && minutes === 0 ? day : `${day} ${pad(hours)}:${pad(minutes)}`
}

function toCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : dateToText(value)
  if (typeof value === "number" || typeof value === "boolean") return value
  return String(value)
}

/** Text of a CSV file as rows. Picks the separator itself (Danish Excel uses `;`). */
export function parseCsvText(text: string): SheetMatrix {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t", "|"],
  })
  return result.data.map((row) => row.map((cell) => (cell === "" ? null : cell)))
}

/** UTF-8, falling back to Windows-1252 so Danish letters from older Excel exports survive. */
function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder("windows-1252").decode(buffer)
  }
}

function checkRows(sheets: ParsedSheet[]): ParsedSheet[] {
  const nonEmpty = sheets.filter((sheet) => sheet.matrix.length > 0)
  if (nonEmpty.length === 0) throw new ImportFileError("empty")
  for (const sheet of nonEmpty) {
    // The first row is a header, so a file may have one more row than it has leads.
    if (sheet.matrix.length - 1 > MAX_IMPORT_ROWS) throw new ImportFileError("too_many_rows")
  }
  return nonEmpty
}

/** Reads an .xlsx or .csv file in the browser. Nothing is sent to the server. */
export async function parseImportFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new ImportFileError("too_large")

  const name = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()

  if (name.endsWith(".xlsx")) {
    try {
      const { default: readExcelFile } = await import("read-excel-file/universal")
      const sheets = await readExcelFile(buffer)
      return {
        fileName: file.name,
        size: file.size,
        sheets: checkRows(
          sheets.map((sheet) => ({
            name: sheet.sheet,
            matrix: sheet.data.map((row) => row.map(toCell)),
          }))
        ),
      }
    } catch (error) {
      if (error instanceof ImportFileError) throw error
      throw new ImportFileError("unreadable")
    }
  }

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    try {
      const matrix = parseCsvText(decodeText(buffer))
      return {
        fileName: file.name,
        size: file.size,
        sheets: checkRows([{ name: file.name, matrix }]),
      }
    } catch (error) {
      if (error instanceof ImportFileError) throw error
      throw new ImportFileError("unreadable")
    }
  }

  if (name.endsWith(".xls")) throw new ImportFileError("xls_unsupported")
  throw new ImportFileError("unsupported")
}
