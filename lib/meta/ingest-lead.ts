import { randomUUID } from "node:crypto"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import { leadRowToLead } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import {
  mapMetaLeadToInsertRow,
  type MetaLeadPayload,
} from "@/lib/meta/lead-mapper"
import { graphFetch } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

const LEAD_FIELDS = "id,created_time,field_data,ad_id"

export async function fetchMetaLeadDetails(
  leadId: string,
  accessToken: string
): Promise<MetaLeadPayload> {
  const url = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v21.0"}/${leadId}?fields=${LEAD_FIELDS}`
  return graphFetch<MetaLeadPayload>(url, accessToken)
}

export async function ingestMetaLead(
  supabase: SupabaseClient,
  organizationId: string,
  lead: MetaLeadPayload
): Promise<{ created: boolean; leadId: string }> {
  const legacyId = String(lead.id || "").trim()
  if (!legacyId) throw new Error("Meta lead ID is required.")

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("legacy_id", legacyId)
    .maybeSingle()

  if (existing?.id) {
    return { created: false, leadId: existing.id }
  }

  const row = mapMetaLeadToInsertRow(organizationId, lead)
  row.id = randomUUID()

  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("legacy_id", legacyId)
        .maybeSingle()
      if (duplicate?.id) return { created: false, leadId: duplicate.id }
    }
    throw error
  }

  const inserted = data as LeadRow
  if (inserted.status === "won") {
    await syncCustomerForWonLead(supabase, inserted)
  }

  return { created: true, leadId: inserted.id }
}

export async function ingestMetaLeadById(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  accessToken: string
) {
  const lead = await fetchMetaLeadDetails(leadId, accessToken)
  return ingestMetaLead(supabase, organizationId, lead)
}

export function leadRowToApiLead(row: LeadRow) {
  return leadRowToLead(row)
}
