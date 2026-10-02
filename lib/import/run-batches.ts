import Papa from "papaparse"

import type {
  ColumnMapping,
  ImportChunkResponse,
  ImportLeadPreview,
  ImportOptions,
  ImportRowInput,
  ImportRowResult,
  ImportSkipReason,
  ImportChange,
} from "@/lib/import/types"
import { IMPORT_CHUNK_SIZE, IMPORT_PREVIEW_LEADS } from "@/lib/import/types"

/** One issue for the list: a skipped row or a row with warnings, with the sheet row number. */
export type ImportIssue = {
  rowNumber: number
  kind: "skipped" | "warning"
  reason?: ImportSkipReason
  messages: string[]
}

export type ImportPreviewRow = {
  rowNumber: number
  lead: ImportLeadPreview
  changes: ImportChange[]
  warnings: string[]
}

export type ImportRunSummary = {
  total: number
  toImport: number
  skipped: Record<ImportSkipReason, number>
  withWarnings: number
  inserted: number
  previews: ImportPreviewRow[]
  issues: ImportIssue[]
  skippedRows: { rowNumber: number; reason: ImportSkipReason }[]
}

export function emptySummary(): ImportRunSummary {
  return {
    total: 0,
    toImport: 0,
    skipped: { no_contact: 0, duplicate_existing: 0, duplicate_file: 0 },
    withWarnings: 0,
    inserted: 0,
    previews: [],
    issues: [],
    skippedRows: [],
  }
}

const MAX_ISSUES = 2000

/** Adds one batch of row results to the running totals (pure, so it can be tested). */
export function addResults(
  summary: ImportRunSummary,
  results: readonly ImportRowResult[],
  inserted = 0
): ImportRunSummary {
  const next: ImportRunSummary = {
    ...summary,
    skipped: { ...summary.skipped },
    previews: [...summary.previews],
    issues: [...summary.issues],
    skippedRows: [...summary.skippedRows],
    inserted: summary.inserted + inserted,
  }
  for (const result of results) {
    next.total += 1
    if (result.outcome === "skip" && result.reason) {
      next.skipped[result.reason] += 1
      next.skippedRows.push({ rowNumber: result.rowNumber, reason: result.reason })
      if (next.issues.length < MAX_ISSUES) {
        next.issues.push({
          rowNumber: result.rowNumber,
          kind: "skipped",
          reason: result.reason,
          messages: [],
        })
      }
      continue
    }
    next.toImport += 1
    if (result.warnings.length > 0) {
      next.withWarnings += 1
      if (next.issues.length < MAX_ISSUES) {
        next.issues.push({
          rowNumber: result.rowNumber,
          kind: "warning",
          messages: result.warnings.map((w) => w.message),
        })
      }
    }
    if (result.lead && next.previews.length < IMPORT_PREVIEW_LEADS) {
      next.previews.push({
        rowNumber: result.rowNumber,
        lead: result.lead,
        changes: result.changes,
        warnings: result.warnings.map((w) => w.message),
      })
    }
  }
  return next
}

export class ImportRunError extends Error {}

async function postChunk(
  slug: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ImportChunkResponse> {
  const response = await fetch(`/api/admin/organizations/${slug}/imports/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await response.json().catch(() => ({}))) as ImportChunkResponse & {
    error?: string
  }
  if (!response.ok) throw new ImportRunError(data.error ?? "Import failed")
  return data
}

/**
 * Sends the rows in batches of 500, one after the other. A test run (`dryRun`) saves nothing and
 * collects what the leads would look like; a real run inserts them into the import.
 */
export async function runImportBatches(input: {
  slug: string
  rows: readonly ImportRowInput[]
  mapping: ColumnMapping
  options: ImportOptions
  dryRun: boolean
  importId?: string
  onProgress?: (done: number, total: number) => void
  /** Called after every batch with the totals so far (useful if a later batch fails). */
  onSummary?: (summary: ImportRunSummary) => void
  signal?: AbortSignal
}): Promise<ImportRunSummary> {
  let summary = emptySummary()
  const { rows } = input
  for (let start = 0; start < rows.length; start += IMPORT_CHUNK_SIZE) {
    if (input.signal?.aborted) throw new ImportRunError("Cancelled")
    const chunk = rows.slice(start, start + IMPORT_CHUNK_SIZE)
    const response = await postChunk(
      input.slug,
      {
        importId: input.importId ?? null,
        dryRun: input.dryRun,
        rows: chunk,
        mapping: input.mapping,
        options: input.options,
        previewCount: input.dryRun
          ? Math.max(0, IMPORT_PREVIEW_LEADS - summary.previews.length)
          : 0,
      },
      input.signal
    )
    summary = addResults(summary, response.results, response.inserted ?? 0)
    input.onProgress?.(Math.min(start + chunk.length, rows.length), rows.length)
    input.onSummary?.(summary)
  }
  return summary
}

/** A CSV of the rows that were skipped, with the reason, so they can be fixed and re-imported. */
export function skippedRowsCsv(
  headers: readonly string[],
  rows: readonly ImportRowInput[],
  skipped: readonly { rowNumber: number; reason: ImportSkipReason }[],
  reasonLabel: (reason: ImportSkipReason) => string
): string {
  const byRow = new Map(rows.map((row) => [row.rowNumber, row]))
  const data = skipped.map(({ rowNumber, reason }) => {
    const row = byRow.get(rowNumber)
    return [
      String(rowNumber),
      reasonLabel(reason),
      ...headers.map((header) => {
        const value = row?.values[header]
        return value === null || value === undefined ? "" : String(value)
      }),
    ]
  })
  return Papa.unparse({ fields: ["Row", "Reason", ...headers], data })
}

/** Identifies a file + mapping + options, so a finished test run can tell when it is out of date. */
export function importFingerprint(input: {
  fileName: string
  size: number
  sheet: string
  headerRow: number
  rowCount: number
  mapping: ColumnMapping
  options: ImportOptions
}): string {
  return JSON.stringify([
    input.fileName,
    input.size,
    input.sheet,
    input.headerRow,
    input.rowCount,
    Object.entries(input.mapping).sort(([a], [b]) => a.localeCompare(b)),
    input.options,
  ])
}
