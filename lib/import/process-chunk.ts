import { findExistingContactKeys, insertImportedLeads } from "@/lib/db/lead-imports-repository"
import {
  listCustomFieldDefs,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import { contactKeys } from "@/lib/import/dedupe"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { buildImportLead } from "@/lib/import/import-row"
import { readMapped } from "@/lib/import/read-mapped"
import type {
  ColumnMapping,
  ImportChunkResponse,
  ImportLeadPreview,
  ImportOptions,
  ImportRowInput,
  ImportRowResult,
} from "@/lib/import/types"
import { nowLeadDateTime } from "@/lib/leads/lead-datetime"
import type { Lead } from "@/lib/leads"
import type { SupabaseClient } from "@supabase/supabase-js"

function preview(lead: Lead): ImportLeadPreview {
  return {
    date: lead.date,
    time: lead.time ?? null,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment,
    companyName: lead.companyName,
    address: lead.address,
    zipCode: lead.zipCode,
    city: lead.city,
    serviceIds: lead.serviceIds,
    status: lead.status,
    salesPrice: lead.salesPrice,
    profit: lead.profit,
    platform: lead.platform,
    customFields: lead.customFields ?? {},
  }
}

/**
 * One batch of rows through the import rules. With `dryRun` nothing is written, so a test run
 * shows exactly what the real import would do; without it the accepted leads are inserted.
 */
export async function processImportChunk(input: {
  supabase: SupabaseClient
  organizationId: string
  importId: string | null
  rows: ImportRowInput[]
  mapping: ColumnMapping
  options: ImportOptions
  dryRun: boolean
  /** How many leads to include in full in the response (for the "how leads will look" table). */
  previewCount: number
}): Promise<ImportChunkResponse> {
  const { supabase, organizationId, rows, mapping, options, dryRun } = input

  const [sheet, services] = await Promise.all([
    resolveLeadSheetForOrganization(supabase, organizationId),
    resolveOrganizationServices(supabase, organizationId),
  ])
  const customFieldDefs = sheet ? listCustomFieldDefs(sheet) : []
  const today = nowLeadDateTime().date

  const built = rows.map((row) => ({
    row,
    result: buildImportLead({
      row: row.values,
      mapping,
      options,
      customFieldDefs,
      services,
      today,
    }),
  }))

  // Which contacts are already leads of this client (one query for the whole batch).
  const existing = new Set<string>()
  if (options.skipDuplicates) {
    const emails: string[] = []
    const phones: string[] = []
    for (const { row, result } of built) {
      if (!result.ok) continue
      for (const key of contactKeys(
        readMapped(row.values, mapping, "email"),
        readMapped(row.values, mapping, "phone")
      )) {
        if (key.startsWith("e:")) emails.push(key.slice(2))
        else phones.push(key.slice(2))
      }
    }
    const found = await findExistingContactKeys(supabase, organizationId, {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)],
    })
    for (const key of found) existing.add(key)
  }

  const results: ImportRowResult[] = []
  const accepted: Lead[] = []
  let previewed = 0

  for (const { row, result } of built) {
    if (!result.ok) {
      results.push({
        rowNumber: row.rowNumber,
        outcome: "skip",
        reason: result.reason,
        warnings: [],
        changes: [],
      })
      continue
    }
    if (options.skipDuplicates && row.fileDuplicate) {
      results.push({
        rowNumber: row.rowNumber,
        outcome: "skip",
        reason: "duplicate_file",
        warnings: [],
        changes: [],
      })
      continue
    }
    const keys = contactKeys(
      readMapped(row.values, mapping, "email"),
      readMapped(row.values, mapping, "phone")
    )
    if (options.skipDuplicates && keys.some((key) => existing.has(key))) {
      results.push({
        rowNumber: row.rowNumber,
        outcome: "skip",
        reason: "duplicate_existing",
        warnings: [],
        changes: [],
      })
      continue
    }

    accepted.push(result.lead)
    results.push({
      rowNumber: row.rowNumber,
      outcome: "import",
      warnings: result.warnings,
      changes: result.changes,
      lead: previewed < input.previewCount ? preview(result.lead) : undefined,
    })
    previewed += 1
  }

  if (dryRun) return { results }

  if (!input.importId) throw new Error("An import id is required to save leads")
  const inserted = await insertImportedLeads(supabase, organizationId, input.importId, accepted)
  return { results, inserted }
}
