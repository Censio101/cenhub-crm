import type { SupabaseClient } from "@supabase/supabase-js"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
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
import { queueWonLeadEventAfterResponse } from "@/lib/meta/capi-outbox"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export async function listLeadsForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
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
  options: { legacyId?: string | null } = {}
): Promise<Lead> {
  const row = leadToInsertRow(lead, organizationId, lead.source ?? "manual", options.legacyId)
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("*")
    .single()

  if (error) throw error
  const inserted = data as LeadRow
  await syncCustomerForWonLead(inserted)
  queueWonLeadEventAfterResponse(inserted)
  return leadRowToLead(inserted)
}

export async function updateLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  patch: LeadPatch
): Promise<Lead> {
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error("Lead not found")

  const row = existing as LeadRow
  const safePatch = filterPatchForLockedLead(patch, row)
  const rowPatch = leadPatchToRow(safePatch)

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
    .select("*")
    .single()

  if (updateError) throw updateError

  const updatedRow = updated as LeadRow
  await syncCustomerForWonLead(updatedRow)
  // A Meta lead that is now won with a price is reported back to Meta (after the response).
  queueWonLeadEventAfterResponse(updatedRow)

  return leadRowToLead(updatedRow)
}

export async function deleteLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("organization_id", organizationId)

  if (error) throw error
}

export async function deleteLeadsByIds(
  supabase: SupabaseClient,
  organizationId: string,
  leadIds: readonly string[]
): Promise<number> {
  if (leadIds.length === 0) return 0
  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .eq("organization_id", organizationId)
    .in("id", [...leadIds])

  if (error) throw error
  return count ?? leadIds.length
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
    .maybeSingle()

  if (error) throw error
  return (data?.id as string | undefined) ?? null
}
