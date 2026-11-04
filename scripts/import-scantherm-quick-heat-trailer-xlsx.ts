/**
 * Import historical Quick-Heat Trailer rows from the Make/Google sheet export.
 *
 * Each row becomes its own lead tagged Leadformular → Quick-Heat Trailer (even when the
 * same contact also exists on Beregning).
 *
 * Dry run (default):
 *   npx tsx scripts/import-scantherm-quick-heat-trailer-xlsx.ts
 *
 * Write to Supabase:
 *   npx tsx scripts/import-scantherm-quick-heat-trailer-xlsx.ts --live
 *
 * Re-run safe: rows use stable legacy_id and are skipped if already imported.
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

import {
  createLeadImport,
  finishLeadImport,
} from "@/lib/db/lead-imports-repository"
import { findLeadIdByLegacyId } from "@/lib/db/leads-repository"
import { leadToInsertRow } from "@/lib/db/lead-mapper"
import { listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { listCustomFieldDefs, resolveLeadSheetForOrganization } from "@/lib/db/lead-sheet-repository"
import {
  IMPORT_STANDARD_TARGETS,
  cleanMapping,
  suggestColumnMapping,
} from "@/lib/import/column-mapping"
import { buildImportLead } from "@/lib/import/import-row"
import { cellText } from "@/lib/import/parse-values"
import { sheetTable } from "@/lib/import/sheet-table"
import type { CellValue, ColumnMapping, ImportOptions } from "@/lib/import/types"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import { nowLeadDateTime } from "@/lib/leads/lead-datetime"
import { createAdminClient } from "@/lib/supabase/admin"

const ORG_SLUG = "scantherm-aps"
const FUNNEL_SLUG = "quick-heat-trailer-b2b"
const DEFAULT_XLSX = resolve(
  process.cwd(),
  "fixtures/import/Scantherm-Quick-Heat-Trailer.xlsx"
)

const XLSX = process.argv.find((a) => a.endsWith(".xlsx")) ?? DEFAULT_XLSX

const LIVE = process.argv.includes("--live")

const options: ImportOptions = {
  defaultStatus: "new_waiting_call",
  defaultPlatform: "website",
  skipDuplicates: false,
  fillExistingFromImport: false,
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

function legacyIdForRow(rowNumber: number, email: string, date: string): string {
  const key = `${email.toLowerCase()}|${date}|${rowNumber}`
  return `import:scantherm-quick-heat:${key.slice(0, 180)}`
}

function mergeMapping(base: ColumnMapping, headers: string[]): ColumnMapping {
  const next = { ...base }
  const ensure = (target: string, names: string[]) => {
    const hit = names.find((n) => headers.includes(n))
    if (hit) next[target] = [hit]
  }
  ensure("customFields.utm_source", ["Platform"])
  ensure("customFields.note", ["Note"])
  return next
}

async function main() {
  const buffer = readFileSync(XLSX)
  const { default: readExcelFile } = await import("read-excel-file/universal")
  const sheets = await readExcelFile(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  )
  const matrix = sheets[0].data.map((row) => row.map(toCell))
  const table = sheetTable(matrix, 1)

  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, ORG_SLUG)
  if (!org) {
    console.error(`Organization not found: ${ORG_SLUG}`)
    process.exit(1)
  }

  const funnels = await listLeadFunnelsForOrganization(admin, org.id)
  const funnel = funnels.find((f) => f.slug === FUNNEL_SLUG)
  if (!funnel) {
    console.error(`Funnel not found: ${FUNNEL_SLUG}. Run ensure-scantherm-b2b-funnel.ts first.`)
    process.exit(1)
  }
  const funnelLabel = funnelSheetSourceLabel(funnel)

  const sheet = await resolveLeadSheetForOrganization(admin, org.id)
  const customDefs = sheet ? listCustomFieldDefs(sheet) : []
  const suggested = suggestColumnMapping(table.headers, [
    ...IMPORT_STANDARD_TARGETS.map((target) => ({ target })),
    ...customDefs.map((def) => ({
      target: `customFields.${def.fieldKey}`,
      names: [def.fieldKey, def.label],
    })),
  ])
  const mapping = mergeMapping(cleanMapping(suggested, table.headers), table.headers)
  const today = nowLeadDateTime().date

  let importRecord: Awaited<ReturnType<typeof createLeadImport>> | null = null
  if (LIVE) {
    importRecord = await createLeadImport(admin, {
      organizationId: org.id,
      fileName: XLSX.split("/").pop() ?? "Scantherm-Quick-Heat-Trailer.xlsx",
      createdBy: null,
      totalRows: table.rows.length,
    })
  }

  const summary: {
    file: string
    mode: string
    funnel: { id: string; slug: string; label: string }
    mapping: ColumnMapping
    imported: number
    skippedExisting: number
    skippedNoContact: number
    warnings: number
    samples: unknown[]
    importRecordId?: string
  } = {
    file: XLSX,
    mode: LIVE ? "live" : "dry-run",
    funnel: { id: funnel.id, slug: funnel.slug, label: funnelLabel },
    mapping,
    imported: 0,
    skippedExisting: 0,
    skippedNoContact: 0,
    warnings: 0,
    samples: [],
  }

  for (const row of table.rows) {
    const built = buildImportLead({
      row: row.values,
      mapping,
      options,
      customFieldDefs: customDefs,
      services: [],
      today,
    })
    if (!built.ok) {
      summary.skippedNoContact += 1
      continue
    }

    const lead = {
      ...built.lead,
      segment: "b2b" as const,
      metaAdId: cellText(row.values["Annonce"], 120),
      leadFunnelId: funnel.id,
      funnelSourceLabel: funnelLabel,
    }

    const legacyId = legacyIdForRow(row.rowNumber, lead.email, lead.date)
    const existingId = LIVE
      ? await findLeadIdByLegacyId(admin, org.id, legacyId)
      : null
    if (existingId) {
      summary.skippedExisting += 1
      continue
    }

    if (built.warnings.length) summary.warnings += 1

    if (!LIVE) {
      summary.imported += 1
      if (summary.samples.length < 2) summary.samples.push(lead)
      continue
    }

    const rowInsert = {
      ...leadToInsertRow(lead, org.id, "import", {
        legacyId,
        leadFunnelId: funnel.id,
        funnelSourceLabel: funnelLabel,
      }),
      import_id: importRecord!.id,
    }
    const { error } = await admin.from("leads").insert(rowInsert)
    if (error) throw error
    summary.imported += 1
    if (summary.samples.length < 2) summary.samples.push({ id: lead.id, email: lead.email, date: lead.date })
  }

  if (LIVE && importRecord) {
    await finishLeadImport(admin, org.id, importRecord.id, {
      skippedCount: summary.skippedNoContact + summary.skippedExisting,
      warningCount: summary.warnings,
    })
    summary.importRecordId = importRecord.id
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!LIVE) {
    console.log("\nAdd --live to insert these leads into Scantherm.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
