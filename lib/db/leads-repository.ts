import type { SupabaseClient } from "@supabase/supabase-js"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import {
  filterPatchForLockedLead,
  leadPatchToRow,
  leadRowToLead,
  leadToInsertRow,
  type LeadPatch,
} from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import { MOCK_LEADS, type Lead } from "@/lib/leads"
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

  if (error) throw error
  return (data as LeadRow[]).map(leadRowToLead)
}

export function listMockLeads(): Lead[] {
  return MOCK_LEADS
}

export async function createLead(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead
): Promise<Lead> {
  const row = leadToInsertRow(lead, organizationId, lead.source ?? "manual")
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("*")
    .single()

  if (error) throw error
  return leadRowToLead(data as LeadRow)
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
  await syncCustomerForWonLead(supabase, updatedRow)

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

export function usesDatabaseLeads(): boolean {
  return isSupabaseConfigured()
}
