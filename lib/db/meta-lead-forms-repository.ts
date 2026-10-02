import type { SupabaseClient } from "@supabase/supabase-js"

import {
  META_TARGET_PREFIX,
  formNeedsRemap,
  mappingStatus,
  type MappingStatus,
} from "@/lib/lead-sheet/mapping-review"
import type { MetaFieldMapping } from "@/lib/meta/meta-field-mapping"

export type MetaLeadFormRow = {
  id: string
  organization_id: string
  meta_form_id: string
  name: string
  status: string
  enabled: boolean
  field_mapping: MetaFieldMapping
  questions_snapshot: unknown[]
  leads_count_cached: number | null
  last_lead_at: string | null
  /** When the mapping was last saved or kept as is; compared with the sheet change date. */
  mapping_reviewed_at: string | null
  /** When this form was last seen on the Meta Page (set by Refresh). */
  synced_at: string | null
  created_at: string
  updated_at: string
}

export async function listMetaLeadFormsForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MetaLeadFormRow[]> {
  const { data, error } = await supabase
    .from("meta_lead_forms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw error
  return (data as MetaLeadFormRow[]) ?? []
}

export async function getMetaLeadFormByMetaFormId(
  supabase: SupabaseClient,
  organizationId: string,
  metaFormId: string
): Promise<MetaLeadFormRow | null> {
  const { data, error } = await supabase
    .from("meta_lead_forms")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("meta_form_id", metaFormId)
    .maybeSingle()

  if (error) throw error
  return (data as MetaLeadFormRow | null) ?? null
}

/**
 * Writes only what Meta owns (name, status, counts, questions). `enabled` and `field_mapping`
 * are left out on purpose: they are the admin's settings, so a refresh can never overwrite a
 * mapping that was saved while it was running. New rows get the column defaults.
 */
export async function upsertMetaLeadFormCatalogRow(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    metaFormId: string
    name: string
    status: string
    leadsCountCached?: number | null
    /** Leave undefined to keep the stored questions. */
    questionsSnapshot?: unknown[]
    /** Set by Refresh so the page can show when the list was last confirmed by Meta. */
    syncedAt?: string
  }
): Promise<MetaLeadFormRow> {
  const row: Record<string, unknown> = {
    organization_id: input.organizationId,
    meta_form_id: input.metaFormId,
    name: input.name,
    status: input.status,
  }
  if (input.leadsCountCached !== undefined) row.leads_count_cached = input.leadsCountCached
  if (input.questionsSnapshot !== undefined) row.questions_snapshot = input.questionsSnapshot
  if (input.syncedAt !== undefined) row.synced_at = input.syncedAt

  const { data, error } = await supabase
    .from("meta_lead_forms")
    .upsert(row, { onConflict: "organization_id,meta_form_id" })
    .select("*")
    .single()

  if (error) throw error
  return data as MetaLeadFormRow
}

export const META_FORM_STATUS_MISSING = "MISSING"

/**
 * After a refresh: forms that are no longer on the Page. Untouched ones (off, no mapping) are
 * removed; anything the admin configured is kept and marked so nothing is lost silently.
 */
export async function reconcileMissingMetaLeadForms(
  supabase: SupabaseClient,
  organizationId: string,
  seenMetaFormIds: ReadonlySet<string>,
  existingRows: readonly MetaLeadFormRow[]
): Promise<void> {
  const missing = existingRows.filter((row) => !seenMetaFormIds.has(row.meta_form_id))
  const removable = missing.filter(
    (row) => !row.enabled && Object.keys(row.field_mapping ?? {}).length === 0
  )
  const keep = missing.filter(
    (row) => !removable.includes(row) && row.status !== META_FORM_STATUS_MISSING
  )

  if (removable.length > 0) {
    const { error } = await supabase
      .from("meta_lead_forms")
      .delete()
      .eq("organization_id", organizationId)
      .in(
        "meta_form_id",
        removable.map((row) => row.meta_form_id)
      )
    if (error) throw error
  }
  if (keep.length > 0) {
    const { error } = await supabase
      .from("meta_lead_forms")
      .update({ status: META_FORM_STATUS_MISSING })
      .eq("organization_id", organizationId)
      .in(
        "meta_form_id",
        keep.map((row) => row.meta_form_id)
      )
    if (error) throw error
  }
}

export async function patchMetaLeadForm(
  supabase: SupabaseClient,
  organizationId: string,
  metaFormId: string,
  patch: {
    enabled?: boolean
    fieldMapping?: MetaFieldMapping
    /** Marks the current mapping as checked against the lead sheet ("keep as is"). */
    markMappingReviewed?: boolean
  }
): Promise<MetaLeadFormRow> {
  const row: Record<string, unknown> = {}
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  if (patch.fieldMapping !== undefined) row.field_mapping = patch.fieldMapping
  // Saving a mapping is a review by definition.
  if (patch.fieldMapping !== undefined || patch.markMappingReviewed) {
    row.mapping_reviewed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("meta_lead_forms")
    .update(row)
    .eq("organization_id", organizationId)
    .eq("meta_form_id", metaFormId)
    .select("*")
    .single()

  if (error) throw error
  return data as MetaLeadFormRow
}

export async function logMetaLeadInboundEvent(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    metaFormId?: string | null
    metaLeadId?: string | null
    statusCode: number
    errorMessage?: string | null
    payload?: unknown
  }
) {
  const { error } = await supabase.from("meta_lead_inbound_events").insert({
    organization_id: input.organizationId,
    meta_form_id: input.metaFormId ?? null,
    meta_lead_id: input.metaLeadId ?? null,
    status_code: input.statusCode,
    error_message: input.errorMessage ?? null,
    payload: input.payload ?? null,
  })
  if (error) throw error
}

export async function getLastMetaLeadInboundAt(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("meta_lead_inbound_events")
    .select("created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data?.created_at as string | undefined) ?? null
}

export async function countRecentMetaInboundFailures(
  supabase: SupabaseClient,
  organizationId: string,
  hoursBack = 24
): Promise<number> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from("meta_lead_inbound_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", since)
    .gte("status_code", 400)

  if (error) throw error
  return count ?? 0
}

/** Remap status for each form against the client's current custom columns. */
export function metaFormMappingStatuses(
  forms: readonly Pick<MetaLeadFormRow, "meta_form_id" | "field_mapping" | "mapping_reviewed_at">[],
  customFields: readonly { key: string }[],
  sheetChangedAt: string | null
): Map<string, MappingStatus> {
  return new Map(
    forms.map((form) => [
      form.meta_form_id,
      mappingStatus({
        mapping: form.field_mapping ?? {},
        prefix: META_TARGET_PREFIX,
        customFields,
        changedAt: sheetChangedAt,
        reviewedAt: form.mapping_reviewed_at,
      }),
    ])
  )
}

/** How many of a client's Meta forms should have their mapping checked again. */
export async function countMetaFormsNeedingRemap(
  supabase: SupabaseClient,
  organizationId: string,
  customFields: readonly { key: string }[]
): Promise<number> {
  const [orgResult, forms] = await Promise.all([
    supabase
      .from("organizations")
      .select("lead_sheet_changed_at")
      .eq("id", organizationId)
      .maybeSingle(),
    listMetaLeadFormsForOrganization(supabase, organizationId),
  ])
  if (orgResult.error) throw orgResult.error

  const changedAt = (orgResult.data?.lead_sheet_changed_at as string | null) ?? null
  let count = 0
  for (const status of metaFormMappingStatuses(forms, customFields, changedAt).values()) {
    if (status.needsRemap) count += 1
  }
  return count
}

/**
 * Cheap, date-based count of forms to remap per client (no lead sheet lookups). Removed
 * columns always come with a sheet change, so the date check covers them too.
 * Used by the notification bell and the client list.
 */
export async function countMetaFormsNeedingRemapByOrganization(
  supabase: SupabaseClient,
  organizations: readonly { id: string; lead_sheet_changed_at?: string | null }[]
): Promise<Map<string, number>> {
  const changedAtByOrg = new Map(
    organizations
      .filter((org) => org.lead_sheet_changed_at)
      .map((org) => [org.id, org.lead_sheet_changed_at as string])
  )
  const counts = new Map<string, number>()
  if (changedAtByOrg.size === 0) return counts

  const { data, error } = await supabase
    .from("meta_lead_forms")
    .select("organization_id, field_mapping, mapping_reviewed_at")
    .in("organization_id", [...changedAtByOrg.keys()])
  if (error) throw error

  for (const row of data ?? []) {
    const orgId = row.organization_id as string
    const needs = formNeedsRemap({
      mapping: (row.field_mapping ?? {}) as MetaFieldMapping,
      changedAt: changedAtByOrg.get(orgId),
      reviewedAt: row.mapping_reviewed_at as string | null,
      danglingCount: 0,
    })
    if (needs) counts.set(orgId, (counts.get(orgId) ?? 0) + 1)
  }
  return counts
}
