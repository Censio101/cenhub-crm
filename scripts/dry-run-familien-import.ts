/**
 * Dry-run Excel import for Familie Løkke (same backend path as admin Test import).
 * Run: npx tsx scripts/dry-run-familien-import.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i < 0) continue
      const key = trimmed.slice(0, i)
      if (!process.env[key]) process.env[key] = trimmed.slice(i + 1)
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { getOrganizationBySlug } from "../lib/db/organizations-repository"
import { listCustomFieldDefs, resolveLeadSheetForOrganization } from "../lib/db/lead-sheet-repository"
import type { CellValue } from "../lib/import/types"
import { markFileDuplicates } from "../lib/import/dedupe"
import {
  IMPORT_STANDARD_TARGETS,
  suggestColumnMapping,
  cleanMapping,
} from "../lib/import/column-mapping"
import { processImportChunk } from "../lib/import/process-chunk"
import { sheetTable } from "../lib/import/sheet-table"
import type { ImportOptions } from "../lib/import/types"
import { createAdminClient } from "../lib/supabase/admin"

const SLUG = "familien-l-kke"
const XLSX =
  process.argv.find((a) => a.endsWith(".xlsx")) ??
  resolve(process.cwd(), "fixtures/import/familien-lokke-lead-flow.xlsx")

const skipDuplicates = process.argv.includes("--allow-duplicates") ? false : true

const options: ImportOptions = {
  defaultStatus: "new_waiting_call",
  defaultPlatform: "",
  skipDuplicates,
  fillExistingFromImport: true,
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

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

async function main() {
  const buffer = readFileSync(XLSX)
  const { default: readExcelFile } = await import("read-excel-file/universal")
  const sheets = await readExcelFile(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  const matrix = sheets[0].data.map((row) => row.map(toCell))
  const table = sheetTable(matrix, 1)
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, SLUG)
  if (!org) {
    console.error("Organization not found:", SLUG)
    process.exit(1)
  }

  const sheet = await resolveLeadSheetForOrganization(admin, org.id)
  const customDefs = sheet ? listCustomFieldDefs(sheet) : []
  const suggested = suggestColumnMapping(table.headers, [
    ...IMPORT_STANDARD_TARGETS.map((target) => ({ target })),
    ...customDefs.map((def) => ({
      target: `customFields.${def.fieldKey}`,
      names: [def.fieldKey, def.label],
    })),
  ])
  const mapping = cleanMapping(suggested, table.headers)
  const rows = markFileDuplicates(table.rows, mapping)

  const live = process.argv.includes("--live")
  const response = await processImportChunk({
    supabase: admin,
    organizationId: org.id,
    importId: null,
    rows,
    mapping,
    options,
    dryRun: !live,
    previewCount: live ? 0 : 5,
  })

  const skipped: Record<string, number> = {}
  let toImport = 0
  let updated = 0
  let warnings = 0
  let emptyService = 0
  for (const r of response.results) {
    if (r.outcome === "update") updated += 1
    if (r.outcome === "import") {
      toImport += 1
      if (r.warnings?.length) warnings += 1
      if (r.lead && r.lead.serviceIds.length === 0) emptyService += 1
    } else if (r.outcome === "skip" && r.reason) {
      skipped[r.reason] = (skipped[r.reason] ?? 0) + 1
    }
  }

  console.log("Org:", org.name, org.id)
  console.log("File:", XLSX)
  console.log("Matrix rows (incl. header):", matrix.length)
  console.log("Data rows (after sheetTable):", table.rows.length)
  console.log("Rows for import (after file dedupe):", rows.length)
  console.log("Mapping:", JSON.stringify(mapping, null, 2))
  console.log("Would import:", toImport)
  console.log("Would update existing:", updated)
  console.log("Skipped:", skipped)
  console.log("Imported rows with empty serviceIds:", emptyService)
  console.log("Rows with warnings:", warnings)
  if (response.results[0]?.lead) {
    console.log("Sample preview:", JSON.stringify(response.results.find((r) => r.lead)?.lead, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
