import type { SupabaseClient } from "@supabase/supabase-js"

import { customerPayloadFromLead } from "@/lib/db/customers-sync"
import { leadToInsertRow } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import type { Lead } from "@/lib/leads"

export type LeadImportStatus = "running" | "done" | "undone"

export type LeadImportRecord = {
  id: string
  organizationId: string
  fileName: string
  totalRows: number
  importedCount: number
  skippedCount: number
  warningCount: number
  status: LeadImportStatus
  createdAt: string
  finishedAt: string | null
}

type ImportRow = {
  id: string
  organization_id: string
  file_name: string
  total_rows: number
  imported_count: number
  skipped_count: number
  warning_count: number
  status: LeadImportStatus
  created_at: string
  finished_at: string | null
}

function mapImport(row: ImportRow): LeadImportRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fileName: row.file_name,
    totalRows: row.total_rows,
    importedCount: row.imported_count,
    skippedCount: row.skipped_count,
    warningCount: row.warning_count,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  }
}

export async function createLeadImport(
  supabase: SupabaseClient,
  input: { organizationId: string; fileName: string; createdBy: string | null; totalRows: number }
): Promise<LeadImportRecord> {
  const { data, error } = await supabase
    .from("lead_imports")
    .insert({
      organization_id: input.organizationId,
      file_name: input.fileName.slice(0, 200),
      created_by: input.createdBy,
      total_rows: input.totalRows,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapImport(data as ImportRow)
}

export async function getLeadImport(
  supabase: SupabaseClient,
  organizationId: string,
  importId: string
): Promise<LeadImportRecord | null> {
  const { data, error } = await supabase
    .from("lead_imports")
    .select("*")
    .eq("id", importId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (error) throw error
  return data ? mapImport(data as ImportRow) : null
}

export async function listLeadImports(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 20
): Promise<LeadImportRecord[]> {
  const { data, error } = await supabase
    .from("lead_imports")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as ImportRow[]).map(mapImport)
}

/** Closes a batch. The imported count is what is really in the database, not what the page says. */
export async function finishLeadImport(
  supabase: SupabaseClient,
  organizationId: string,
  importId: string,
  input: { skippedCount: number; warningCount: number }
): Promise<LeadImportRecord> {
  const { count, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("import_id", importId)
  if (countError) throw countError

  const { data, error } = await supabase
    .from("lead_imports")
    .update({
      imported_count: count ?? 0,
      skipped_count: Math.max(0, Math.trunc(input.skippedCount)),
      warning_count: Math.max(0, Math.trunc(input.warningCount)),
      status: "done",
      finished_at: new Date().toISOString(),
    })
    .eq("id", importId)
    .eq("organization_id", organizationId)
    .select("*")
    .single()
  if (error) throw error
  return mapImport(data as ImportRow)
}

/** Removes exactly the leads this import created (their customer rows go with them). */
export async function undoLeadImport(
  supabase: SupabaseClient,
  organizationId: string,
  importId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("organization_id", organizationId)
    .eq("import_id", importId)
    .select("id")
  if (error) throw error

  const { error: updateError } = await supabase
    .from("lead_imports")
    .update({ status: "undone", finished_at: new Date().toISOString() })
    .eq("id", importId)
    .eq("organization_id", organizationId)
  if (updateError) throw updateError
  return data?.length ?? 0
}

/** Inserts the leads (one request) and adds customer rows for the ones that are won. */
export async function insertImportedLeads(
  supabase: SupabaseClient,
  organizationId: string,
  importId: string,
  leads: Lead[]
): Promise<number> {
  if (leads.length === 0) return 0
  const rows = leads.map((lead) => ({
    ...leadToInsertRow(lead, organizationId, "import", null),
    import_id: importId,
  }))
  const { data, error } = await supabase.from("leads").insert(rows).select("*")
  if (error) throw error

  const inserted = (data ?? []) as LeadRow[]
  const won = inserted.filter((row) => row.status === "won")
  if (won.length > 0) {
    const { error: customerError } = await supabase
      .from("customers")
      .insert(won.map(customerPayloadFromLead))
    if (customerError) throw customerError
  }
  return inserted.length
}

/** Which of these emails / phone keys already belong to a lead of this client. */
export async function findExistingContactKeys(
  supabase: SupabaseClient,
  organizationId: string,
  input: { emails: string[]; phones: string[] }
): Promise<Set<string>> {
  const keys = new Set<string>()
  if (input.emails.length === 0 && input.phones.length === 0) return keys
  const { data, error } = await supabase.rpc("existing_lead_contact_keys", {
    p_org_id: organizationId,
    p_emails: input.emails,
    p_phones: input.phones,
  })
  if (error) throw error
  for (const row of (data ?? []) as { kind: string; key: string }[]) {
    keys.add(row.kind === "email" ? `e:${row.key}` : `p:${row.key}`)
  }
  return keys
}
