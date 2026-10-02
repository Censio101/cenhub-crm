import { randomUUID } from "node:crypto"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import { leadRowToLead } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import {
  mapMetaLeadToInsertRow,
  type MetaLeadPayload,
} from "@/lib/meta/lead-mapper"
import {
  listCustomFieldDefs,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import {
  META_CUSTOM_TARGET_PREFIX,
  type MetaFieldMapping,
} from "@/lib/meta/meta-field-mapping"
import { graphFetch } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

const LEAD_FIELDS = "id,created_time,field_data,ad_id,form_id"
const RETRY_DELAYS_MS = [0, 1000, 2000, 4000]

function isLeadNotReadyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|does not exist|temporarily|try again/i.test(message)
}

export async function fetchMetaLeadDetails(
  leadId: string,
  accessToken: string
): Promise<MetaLeadPayload> {
  const url = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v21.0"}/${leadId}?fields=${LEAD_FIELDS}`
  return graphFetch<MetaLeadPayload>(url, accessToken)
}

export async function fetchMetaLeadDetailsWithRetry(
  leadId: string,
  accessToken: string
): Promise<MetaLeadPayload> {
  let lastError: unknown
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    try {
      return await fetchMetaLeadDetails(leadId, accessToken)
    } catch (error) {
      lastError = error
      if (!isLeadNotReadyError(error)) throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Meta lead not ready.")
}

export async function ingestMetaLead(
  supabase: SupabaseClient,
  organizationId: string,
  lead: MetaLeadPayload,
  options: { fieldMapping?: MetaFieldMapping; metaFormId?: string | null } = {}
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

  // Only look up the lead sheet when this form maps answers to custom columns.
  const mapsCustomColumns = Object.keys(options.fieldMapping ?? {}).some((key) =>
    key.startsWith(META_CUSTOM_TARGET_PREFIX)
  )
  let customFieldDefs: ReturnType<typeof listCustomFieldDefs> | undefined
  if (mapsCustomColumns) {
    const sheet = await resolveLeadSheetForOrganization(supabase, organizationId)
    customFieldDefs = sheet ? listCustomFieldDefs(sheet) : []
  }

  const row = mapMetaLeadToInsertRow(organizationId, lead, { ...options, customFieldDefs })
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
  accessToken: string,
  options: { fieldMapping?: MetaFieldMapping; metaFormId?: string | null } = {}
) {
  const lead = await fetchMetaLeadDetailsWithRetry(leadId, accessToken)
  return ingestMetaLead(supabase, organizationId, lead, options)
}

export function leadRowToApiLead(row: LeadRow) {
  return leadRowToLead(row)
}
