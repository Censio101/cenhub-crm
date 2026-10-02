import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveLeadSheetForOrganization } from "@/lib/db/lead-sheet-repository"
import { metaFormMappingStatuses, type MetaLeadFormRow } from "@/lib/db/meta-lead-forms-repository"
import type { OrganizationRow } from "@/lib/db/types"
import { computeMetaInstantFormsSummary } from "@/lib/meta/meta-instant-forms-service"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"

/** Same shape for GET, Refresh and save, so the page can apply any of them the same way. */
export type InstantFormsView = Awaited<ReturnType<typeof buildInstantFormsView>>

export async function loadLeadSheetInfo(supabase: SupabaseClient, organizationId: string) {
  const leadSheet = await resolveLeadSheetForOrganization(supabase, organizationId)
  const info = buildWebhookLeadSheetInfo(leadSheet)
  return {
    customFields: info?.customFields ?? [],
    leadSheet: info
      ? {
          templateName: info.templateName,
          isSystemDefault: info.isSystemDefault,
          isClientOwned: info.isClientOwned,
        }
      : null,
  }
}

export async function buildInstantFormsView(
  supabase: SupabaseClient,
  organization: Pick<OrganizationRow, "id" | "lead_sheet_changed_at">,
  rows: MetaLeadFormRow[]
) {
  const { customFields, leadSheet } = await loadLeadSheetInfo(supabase, organization.id)
  const statuses = metaFormMappingStatuses(
    rows,
    customFields,
    organization.lead_sheet_changed_at ?? null
  )
  const forms = rows.map((row) => ({
    ...row,
    inActiveAds: false,
    mappingStatus: statuses.get(row.meta_form_id) ?? null,
  }))
  const summary = computeMetaInstantFormsSummary(forms)
  const catalogSyncedAt = rows.reduce<string | null>((latest, row) => {
    const at = row.synced_at
    if (!at) return latest
    return !latest || at > latest ? at : latest
  }, null)

  return { forms, customFields, leadSheet, summary, catalogSyncedAt }
}
