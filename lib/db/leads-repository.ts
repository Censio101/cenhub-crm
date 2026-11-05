import type { SupabaseClient } from "@supabase/supabase-js"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import {
  recordLeadAuditEvent,
  type LeadAuditContext,
} from "@/lib/db/lead-audit-repository"
import { applyWonDateForStatusChange } from "@/lib/db/won-date"
import {
  filterPatchForLockedLead,
  leadPatchToRow,
  leadRowToLead,
  leadToInsertRow,
  type LeadPatch,
} from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import { MOCK_LEADS, type Lead } from "@/lib/leads"
import { queueLeadStageEventsAfterResponse } from "@/lib/meta/capi-outbox"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export async function listLeadsForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("lead_date", { ascending: false })
    .order("lead_time", { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data as LeadRow[]).map(leadRowToLead)
}

export function listMockLeads(): Lead[] {
  return MOCK_LEADS
}

export async function createLead(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead,
  options: {
    legacyId?: string | null
    leadFunnelId?: string | null
    funnelSourceLabel?: string | null
    audit?: LeadAuditContext
  } = {}
): Promise<Lead> {
  const { audit, ...insertOptions } = options
  const row = leadToInsertRow(lead, organizationId, lead.source ?? "manual", insertOptions)
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("*")
    .single()

  if (error) throw error
  const inserted = data as LeadRow
  await syncCustomerForWonLead(inserted)
  queueLeadStageEventsAfterResponse(inserted, null)
  await recordLeadAuditEvent(supabase, organizationId, inserted.id, "created", {
    ...audit,
    source: audit?.source ?? "api",
  })
  return leadRowToLead(inserted)
}

export async function updateLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  patch: LeadPatch,
  audit: LeadAuditContext = {}
): Promise<Lead> {
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error("Lead not found")

  const row = existing as LeadRow
  const safePatch = filterPatchForLockedLead(patch, row)
  const rowPatch = leadPatchToRow(safePatch)
  delete (rowPatch as Record<string, unknown>).deleted_at
  delete (rowPatch as Record<string, unknown>).deleted_by

  const nextStatus = (rowPatch.status ?? row.status) as string
  const wonDateChange = applyWonDateForStatusChange(
    row.status,
    nextStatus,
    row.won_date
  )
  if (wonDateChange !== undefined) {
    rowPatch.won_date = wonDateChange
  }

  if (Object.keys(rowPatch).length === 0) {
    return leadRowToLead(row)
  }

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update(rowPatch)
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("*")
    .single()

  if (updateError) throw updateError

  const updatedRow = updated as LeadRow
  await syncCustomerForWonLead(updatedRow)
  queueLeadStageEventsAfterResponse(updatedRow, row.status)
  await recordLeadAuditEvent(supabase, organizationId, leadId, "updated", {
    ...audit,
    source: audit.source ?? "api",
  })

  return leadRowToLead(updatedRow)
}

export async function deleteLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  audit: LeadAuditContext = {}
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("soft_delete_lead", { p_lead_id: leadId })
  if (rpcError) {
    const msg = rpcError.message ?? "Failed to delete lead"
    if (msg.includes("forbidden")) throw new Error("forbidden")
    if (msg.includes("not found")) throw new Error("Lead not found")
    throw rpcError
  }

  const admin = createAdminClient()
  await admin.from("customers").delete().eq("lead_id", leadId)

  await recordLeadAuditEvent(supabase, organizationId, leadId, "soft_deleted", {
    ...audit,
    source: audit.source ?? "api",
  })
}

/** Censio admin: permanently remove rows (bulk cleanup). */
export async function hardDeleteLeadsByIds(
  supabase: SupabaseClient,
  organizationId: string,
  leadIds: readonly string[],
  audit: LeadAuditContext = {}
): Promise<number> {
  if (leadIds.length === 0) return 0

  for (const leadId of leadIds) {
    await recordLeadAuditEvent(supabase, organizationId, leadId, "hard_deleted", {
      ...audit,
      source: audit.source ?? "api",
    })
  }

  const admin = createAdminClient()
  await admin.from("customers").delete().in("lead_id", [...leadIds])

  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .eq("organization_id", organizationId)
    .in("id", [...leadIds])

  if (error) throw error
  return count ?? leadIds.length
}

/** @deprecated Prefer deleteLeadById (soft). Kept for call sites that expect a count. */
export async function deleteLeadsByIds(
  supabase: SupabaseClient,
  organizationId: string,
  leadIds: readonly string[],
  audit: LeadAuditContext = {}
): Promise<number> {
  let deleted = 0
  for (const id of leadIds) {
    await deleteLeadById(supabase, organizationId, id, audit)
    deleted += 1
  }
  return deleted
}

export async function restoreLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  audit: LeadAuditContext = {}
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .not("deleted_at", "is", null)
    .select("*")
    .single()

  if (error) throw error
  const row = data as LeadRow
  await syncCustomerForWonLead(row)
  await recordLeadAuditEvent(supabase, organizationId, leadId, "restored", {
    ...audit,
    source: audit.source ?? "api",
  })
  return leadRowToLead(row)
}

export function usesDatabaseLeads(): boolean {
  return isSupabaseConfigured()
}

/** Finds a lead by its external identity (`legacy_id`), scoped to one organization. */
export async function findLeadIdByLegacyId(
  supabase: SupabaseClient,
  organizationId: string,
  legacyId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("legacy_id", legacyId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  return (data?.id as string | undefined) ?? null
}
