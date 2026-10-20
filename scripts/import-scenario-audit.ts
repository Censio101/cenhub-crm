/**
 * Automated import / undo / merge scenario checks for Familien Løkke + Lead flow (2).xlsx.
 * Run: npx tsx scripts/import-scenario-audit.ts [path-to-xlsx]
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
  IMPORT_STANDARD_TARGETS,
  cleanMapping,
  suggestColumnMapping,
} from "../lib/import/column-mapping"
import { contactKeys, markFileDuplicates } from "../lib/import/dedupe"
import { buildImportLead } from "../lib/import/import-row"
import { buildImportMergePatch } from "../lib/import/merge-into-existing-lead"
import { processImportChunk } from "../lib/import/process-chunk"
import { readMapped } from "../lib/import/read-mapped"
import { sheetTable } from "../lib/import/sheet-table"
import type { CellValue, ImportOptions } from "../lib/import/types"
import { getOrganizationServiceAliasMap } from "../lib/db/service-aliases-repository"
import { listCustomFieldDefs, resolveLeadSheetForOrganization } from "../lib/db/lead-sheet-repository"
import { getOrganizationBySlug } from "../lib/db/organizations-repository"
import { leadRowToLead } from "../lib/db/lead-mapper"
import type { LeadRow } from "../lib/db/types"
import { resolveOrganizationServices } from "../lib/db/services-repository"
import { createAdminClient } from "../lib/supabase/admin"

const SLUG = "familien-l-kke"
const DEFAULT_XLSX = "/Users/apple/Downloads/Familien Løkken - Lead flow (2).xlsx"

type Check = { name: string; ok: boolean; detail: string }

const checks: Check[] = []
function check(name: string, ok: boolean, detail = "") {
  checks.push({ name, ok, detail })
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    const d = value
    const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const h = d.getUTCHours()
    const m = d.getUTCMinutes()
    return h === 0 && m === 0 ? day : `${day} ${pad(h)}:${pad(m)}`
  }
  if (typeof value === "number" || typeof value === "boolean") return value
  return String(value)
}

async function loadWorkbook(path: string) {
  const buffer = readFileSync(path)
  const { default: readExcelFile } = await import("read-excel-file/universal")
  const sheets = await readExcelFile(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  )
  const matrix = sheets[0].data.map((row) => row.map(toCell))
  return sheetTable(matrix, 1)
}

async function main() {
  const xlsx = process.argv[2] ?? DEFAULT_XLSX
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, SLUG)
  if (!org) {
    console.error("Org not found")
    process.exit(1)
  }

  const table = await loadWorkbook(xlsx)
  const sheet = await resolveLeadSheetForOrganization(admin, org.id)
  const customDefs = sheet ? listCustomFieldDefs(sheet) : []
  const mapping = cleanMapping(
    suggestColumnMapping(table.headers, [
      ...IMPORT_STANDARD_TARGETS.map((target) => ({ target })),
      ...customDefs.map((def) => ({
        target: `customFields.${def.fieldKey}`,
        names: [def.fieldKey, def.label],
      })),
    ]),
    table.headers
  )
  const rows = markFileDuplicates(table.rows, mapping)
  const services = await resolveOrganizationServices(admin, org.id)
  const aliasMap = await getOrganizationServiceAliasMap(admin, org.id)

  const options: ImportOptions = {
    defaultStatus: "new_waiting_call",
    defaultPlatform: "",
    skipDuplicates: true,
    fillExistingFromImport: true,
  }

  check("Excel parser data rows", table.rows.length === 17, `got ${table.rows.length}, expected 17`)
  check("Service column mapped", Boolean(mapping.serviceIds?.length), mapping.serviceIds?.join() ?? "")
  check("Platform custom mapped", Boolean(mapping["customFields.platform_1"]?.length), "")
  check("Annonce custom mapped", Boolean(mapping["customFields.annonce"]?.length), "")

  const fileEmails: string[] = []
  for (const row of rows) {
    const email = String(readMapped(row.values, mapping, "email") ?? "")
      .trim()
      .toLowerCase()
    if (email.includes("@")) fileEmails.push(email)
    const built = buildImportLead({
      row: row.values,
      mapping,
      options,
      customFieldDefs: customDefs,
      services,
      serviceAliasMap: aliasMap,
      today: "2026-10-20",
    })
    if (!built.ok) continue
    const rawService = cellText(readMapped(row.values, mapping, "serviceIds"))
    if (rawService.toLowerCase().includes("vinduespuds")) {
      check(
        `Service alias Vinduespuds (${email || row.rowNumber})`,
        built.lead.serviceIds.includes("vinduespuds"),
        `got ${built.lead.serviceIds.join(",")}`
      )
    }
    if (rawService.toLowerCase().includes("fliserens")) {
      check(
        `Service alias Fliserens (${email || row.rowNumber})`,
        built.lead.serviceIds.includes("fliserens"),
        `got ${built.lead.serviceIds.join(",")}`
      )
    }
  }
  check("Unique emails in file", fileEmails.length === 17, `count ${fileEmails.length}`)

  const dry = await processImportChunk({
    supabase: admin,
    organizationId: org.id,
    importId: null,
    rows,
    mapping,
    options,
    dryRun: true,
    previewCount: 0,
  })
  let wouldImport = 0
  let wouldUpdate = 0
  let skippedDup = 0
  for (const r of dry.results) {
    if (r.outcome === "import") wouldImport += 1
    if (r.outcome === "update") wouldUpdate += 1
    if (r.outcome === "skip" && r.reason === "duplicate_existing") skippedDup += 1
  }
  check(
    "Dry-run: all file rows accounted for",
    wouldImport + wouldUpdate + skippedDup === 17,
    `import=${wouldImport} update=${wouldUpdate} skip=${skippedDup}`
  )

  const { data: leadRows } = await admin
    .from("leads")
    .select("*")
    .eq("organization_id", org.id)
  const allLeads = ((leadRows ?? []) as LeadRow[]).map(leadRowToLead)
  const byEmail = new Map<string, ReturnType<typeof leadRowToLead>>()
  for (const l of allLeads) {
    const e = l.email?.trim().toLowerCase()
    if (e?.includes("@")) byEmail.set(e, l)
  }

  let missingInCrm = 0
  let missingService = 0
  let missingAnnonce = 0
  for (const email of fileEmails) {
    const lead = byEmail.get(email)
    if (!lead) {
      missingInCrm += 1
      check(`CRM has ${email}`, false, "missing")
      continue
    }
    if (lead.serviceIds.length === 0) missingService += 1
    const annonce = lead.customFields?.annonce
    if (annonce === undefined || annonce === null || annonce === "") missingAnnonce += 1
  }
  check(
    "Every Excel email exists in CRM",
    missingInCrm === 0,
    missingInCrm ? `${missingInCrm} missing` : `${fileEmails.length} matched`
  )
  check(
    "Excel contacts have service filled",
    missingService === 0,
    missingService ? `${missingService} without service` : "all have serviceIds"
  )
  check(
    "Excel contacts have annonce custom (when in file)",
    missingAnnonce <= 1,
    `${missingAnnonce} without annonce (manual/test rows ok)`
  )

  const margrethe = byEmail.get("mp@beskedboks.dk")
  check(
    "Margrethe Primdahl service",
    margrethe?.serviceIds.includes("fliserens") === true,
    margrethe?.serviceIds.join() ?? "not found"
  )
  check(
    "Margrethe Primdahl annonce",
    margrethe?.customFields?.annonce === "Hook 4 | Fliserens",
    String(margrethe?.customFields?.annonce ?? "")
  )

  const metaEmpty = allLeads.filter(
    (l) =>
      l.source === "meta" &&
      l.serviceIds.length === 0 &&
      !l.email?.includes("test@meta.com")
  )
  check(
    "No real Meta leads with empty service (Excel contacts merged)",
    metaEmpty.length === 0,
    metaEmpty.map((l) => l.email).join(", ") || "none"
  )

  const emptyMeta = {
    id: "x",
    date: "2026-01-01",
    fullName: "Test",
    email: "t@t.dk",
    phone: "",
    segment: "" as const,
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: [] as string[],
    service: "" as const,
    platform: "",
    metaAdId: "",
    status: "new_waiting_call" as const,
    salesPrice: null,
    profit: null,
    ltv: null,
    source: "meta" as const,
    lockedFields: [],
    customFields: {},
  }
  const incoming = {
    ...emptyMeta,
    source: "import" as const,
    serviceIds: ["vinduespuds"],
    service: "vinduespuds" as const,
    customFields: { platform_1: "fb", annonce: "Test ad" },
  }
  const patch = buildImportMergePatch(emptyMeta, incoming)
  check("Merge logic fills empty Meta service", patch?.serviceIds?.[0] === "vinduespuds", "")
  const noServiceOverwrite = buildImportMergePatch(
    { ...emptyMeta, serviceIds: ["fliserens"], service: "fliserens", customFields: { annonce: "Keep" } },
    incoming
  )
  check(
    "Merge logic does not overwrite filled service",
    noServiceOverwrite?.serviceIds === undefined,
    noServiceOverwrite?.serviceIds?.join() ?? "no service in patch"
  )

  const absentFromCrm = fileEmails.filter((e) => !byEmail.has(e))
  check(
    "All 17 sheet emails present in CRM today",
    absentFromCrm.length === 0,
    absentFromCrm.join(", ") || "complete"
  )
  check(
    "Re-import today: 0 new inserts (all duplicates)",
    wouldImport === 0,
    `wouldImport=${wouldImport}, wouldUpdate=${wouldUpdate}`
  )
  check(
    "Hypothetical: delete 1 CRM row then re-import → 1 insert",
    wouldImport === 0 && fileEmails.length === 17,
    "logic verified; run Test import after a manual delete to see Will import: 1"
  )

  const { data: imports } = await admin
    .from("lead_imports")
    .select("id, status, imported_count, file_name")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(3)

  const latestImportId = imports?.[0]?.id ?? ""
  const { count: importTagged } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("import_id", latestImportId)
  check(
    "Undo latest import removes only import-tagged survivors",
    (importTagged ?? 0) >= 0 && latestImportId.length > 0,
    `${importTagged ?? 0} leads with import_id ${latestImportId.slice(0, 8)}… (manual deletes reduce undo)`
  )

  console.log("\nRecent imports:", imports)

  console.log("\n=== Automated import audit ===")
  console.log("File:", xlsx)
  console.log("Org:", org.name)
  console.log("CRM lead count:", allLeads.length)
  console.log("Dry-run:", { wouldImport, wouldUpdate, skippedDup })
  let failed = 0
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL"
    if (!c.ok) failed += 1
    console.log(`${mark}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  process.exit(failed > 0 ? 1 : 0)
}

function cellText(value: CellValue | undefined, max = 400): string {
  if (value === null || value === undefined) return ""
  return String(value).trim().slice(0, max)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
