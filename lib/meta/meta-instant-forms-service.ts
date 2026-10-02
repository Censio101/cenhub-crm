import {
  getMetaLeadsPreviewCacheMeta,
  listMetaLeadsPreviewFromCache,
  mergeMetaLeadsPreviewCache,
} from "@/lib/db/meta-leads-preview-repository"
import {
  getMetaLeadFormByMetaFormId,
  listMetaLeadFormsForOrganization,
  logMetaLeadInboundEvent,
  reconcileMissingMetaLeadForms,
  upsertMetaLeadFormCatalogRow,
  type MetaLeadFormRow,
} from "@/lib/db/meta-lead-forms-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { ingestMetaLead, ingestMetaLeadById } from "@/lib/meta/ingest-lead"
import { mapWithConcurrency } from "@/lib/async/map-with-concurrency"
import {
  getLeadgenFormQuestions,
  getPageSubscriptionStatus,
  listLeadgenForms,
  subscribePageToLeadgenWebhooks,
} from "@/lib/meta/leadgen-forms"
import { fetchMetaLeadDetailsWithRetry } from "@/lib/meta/ingest-lead"
import type { MetaLeadPayload } from "@/lib/meta/lead-mapper"
import { flattenMetaFieldData } from "@/lib/meta/meta-lead-field-display"
import { validateMetaFieldMappingForEnable } from "@/lib/meta/meta-field-mapping"
import { resolvePageAccessTokenForOrganization } from "@/lib/meta/resolve-page-access-token"
import { fetchAllGraphPages, graphFetch, GRAPH_VERSION } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

export type MetaInstantFormCatalogItem = MetaLeadFormRow & {
  inActiveAds: boolean
}

export type MetaInstantFormsSummary = {
  total: number
  enabled: number
  activeInAds: number
  activeNotEnabled: number
}

export function computeMetaInstantFormsSummary(
  forms: Array<{ enabled: boolean; inActiveAds: boolean }>
): MetaInstantFormsSummary {
  let enabled = 0
  let activeInAds = 0
  let activeNotEnabled = 0
  for (const form of forms) {
    if (form.enabled) enabled += 1
    if (form.inActiveAds) {
      activeInAds += 1
      if (!form.enabled) activeNotEnabled += 1
    }
  }
  return {
    total: forms.length,
    enabled,
    activeInAds,
    activeNotEnabled,
  }
}

function formNeedsQuestionsSnapshot(existing: MetaLeadFormRow | null): boolean {
  if (!existing) return true
  const snapshot = existing.questions_snapshot
  return !Array.isArray(snapshot) || snapshot.length === 0
}

export type MetaCatalogSyncResult = {
  forms: MetaInstantFormCatalogItem[]
  /** Forms whose questions could not be loaded this time (they retry on the next refresh). */
  questionsFailed: number
}

/**
 * Refresh: the only place (besides the leads tab) that reads the form list from Meta. Saves the
 * result to `meta_lead_forms`; the page and webhook ingest then work from the database.
 */
export async function syncMetaInstantFormsCatalog(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MetaCatalogSyncResult> {
  const { token: pageToken, pageId } = await resolvePageAccessTokenForOrganization(
    supabase,
    organizationId
  )

  const [forms, existingRows] = await Promise.all([
    listLeadgenForms(pageId, pageToken),
    listMetaLeadFormsForOrganization(supabase, organizationId),
  ])
  const existingByFormId = new Map(existingRows.map((row) => [row.meta_form_id, row]))

  let questionsFailed = 0
  // Questions never change on a Meta form, so they are only fetched when we have none yet.
  const questionSnapshots = await mapWithConcurrency(forms, 5, async (form) => {
    const existing = existingByFormId.get(form.id) ?? null
    if (!formNeedsQuestionsSnapshot(existing)) return undefined
    try {
      const detail = await getLeadgenFormQuestions(form.id, pageToken)
      return detail.questions as unknown[]
    } catch {
      questionsFailed += 1
      return undefined
    }
  })

  const syncedAt = new Date().toISOString()
  await mapWithConcurrency(forms, 8, async (form, index) => {
    await upsertMetaLeadFormCatalogRow(supabase, {
      organizationId,
      metaFormId: form.id,
      name: form.name ?? form.id,
      status: form.status ?? "",
      leadsCountCached: form.leads_count ?? null,
      questionsSnapshot: questionSnapshots[index],
      syncedAt,
    })
  })

  await reconcileMissingMetaLeadForms(
    supabase,
    organizationId,
    new Set(forms.map((form) => form.id)),
    existingRows
  )

  const rows = await listMetaLeadFormsForOrganization(supabase, organizationId)
  return {
    forms: rows.map((row) => ({ ...row, inActiveAds: false })),
    questionsFailed,
  }
}

export async function getMetaInstantFormsHealth(supabase: SupabaseClient, organizationId: string) {
  const { token, pageId } = await resolvePageAccessTokenForOrganization(supabase, organizationId)
  const subscriptions = await getPageSubscriptionStatus(pageId, token)
  const leadgenSubscribed = subscriptions.some((app) =>
    (app.subscribed_fields ?? []).includes("leadgen")
  )
  return { leadgenSubscribed, subscriptions }
}

export async function subscribeOrganizationLeadgenWebhooks(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { token, pageId } = await resolvePageAccessTokenForOrganization(supabase, organizationId)
  await subscribePageToLeadgenWebhooks(pageId, token)
  return getMetaInstantFormsHealth(supabase, organizationId)
}

/** Subscribe Page to leadgen webhooks when at least one form is enabled for ingest. */
export async function ensureLeadgenWebhooksWhenFormsEnabled(
  supabase: SupabaseClient,
  organizationId: string,
  enabledFormCount: number
): Promise<Awaited<ReturnType<typeof getMetaInstantFormsHealth>> | null> {
  if (enabledFormCount <= 0) return null
  const health = await getMetaInstantFormsHealth(supabase, organizationId)
  if (health.leadgenSubscribed) return health
  return subscribeOrganizationLeadgenWebhooks(supabase, organizationId)
}

export async function importMetaInstantLeads(
  supabase: SupabaseClient,
  organizationId: string,
  options: { daysBack?: number; metaFormIds?: string[] } = {}
) {
  const { token: pageToken, pageId } = await resolvePageAccessTokenForOrganization(
    supabase,
    organizationId
  )
  const catalogRows = await listMetaLeadFormsForOrganization(supabase, organizationId)
  const enabledByFormId = new Map(catalogRows.map((f) => [f.meta_form_id, f.enabled]))

  const forms = await listLeadgenForms(pageId, pageToken)
  const targetIds = new Set(
    options.metaFormIds?.length ? options.metaFormIds : forms.map((f) => f.id)
  )

  if (targetIds.size === 0) {
    return { scanned: 0, imported: 0, skipped: true, reason: "No lead forms on this Page." }
  }
  const cutoffMs =
    options.daysBack && options.daysBack > 0
      ? Date.now() - options.daysBack * 24 * 60 * 60 * 1000
      : null

  let scanned = 0
  let imported = 0

  for (const form of forms) {
    if (!targetIds.has(form.id)) continue
    const config = await getMetaLeadFormByMetaFormId(supabase, organizationId, form.id)
    const enabled = enabledByFormId.get(form.id) ?? config?.enabled ?? false
    if (!enabled) continue

    const leadsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${form.id}/leads?fields=id,created_time,field_data,ad_id`
    const rows = await fetchAllGraphPages<MetaLeadPayload>(leadsUrl, pageToken, 10)

    for (const lead of rows) {
      scanned += 1
      if (cutoffMs && lead.created_time) {
        const created = new Date(lead.created_time).getTime()
        if (!Number.isNaN(created) && created < cutoffMs) continue
      }
      const result = await ingestMetaLead(supabase, organizationId, lead, {
        fieldMapping: config?.field_mapping ?? {},
        metaFormId: form.id,
      })
      if (result.created) imported += 1
    }
  }

  return { scanned, imported, skipped: false }
}

/** Max rows returned per request (UI page size until pagination is wired). */
export const META_INSTANT_LEADS_PAGE_SIZE = 50

export type MetaInstantLeadPreviewRow = {
  metaLeadId: string
  metaFormId: string
  formName: string
  createdTime: string | null
  fields: Record<string, string>
}

function normalizePreviewPageOptions(options: { page?: number; pageSize?: number }) {
  const pageSize = Math.min(
    Math.max(1, options.pageSize ?? META_INSTANT_LEADS_PAGE_SIZE),
    META_INSTANT_LEADS_PAGE_SIZE
  )
  const page = Math.max(1, options.page ?? 1)
  return { page, pageSize }
}

export async function fetchAllMetaLeadsPreviewFromGraph(
  supabase: SupabaseClient,
  organizationId: string,
  options: { daysBack?: number } = {}
): Promise<{ leads: MetaInstantLeadPreviewRow[]; skipped: boolean; reason?: string }> {
  const { token: pageToken, pageId } = await resolvePageAccessTokenForOrganization(
    supabase,
    organizationId
  )
  const catalogRows = await listMetaLeadFormsForOrganization(supabase, organizationId)
  const formNameById = new Map(catalogRows.map((f) => [f.meta_form_id, f.name]))

  const cutoffMs =
    options.daysBack && options.daysBack > 0
      ? Date.now() - options.daysBack * 24 * 60 * 60 * 1000
      : null

  const graphForms = await listLeadgenForms(pageId, pageToken)

  if (graphForms.length === 0) {
    return { leads: [], skipped: true, reason: "No lead forms on this Page." }
  }

  const perFormLeads = await mapWithConcurrency(graphForms, 3, async (form) => {
    const leadsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${form.id}/leads?fields=id,created_time,field_data`
    const rows = await fetchAllGraphPages<MetaLeadPayload>(leadsUrl, pageToken, 10)
    const out: MetaInstantLeadPreviewRow[] = []
    for (const lead of rows) {
      const metaLeadId = String(lead.id || "").trim()
      if (!metaLeadId) continue
      if (cutoffMs && lead.created_time) {
        const created = new Date(lead.created_time).getTime()
        if (!Number.isNaN(created) && created < cutoffMs) continue
      }
      out.push({
        metaLeadId,
        metaFormId: form.id,
        formName: formNameById.get(form.id) ?? form.name ?? form.id,
        createdTime: lead.created_time ?? null,
        fields: flattenMetaFieldData(lead.field_data),
      })
    }
    return out
  })

  const leads = perFormLeads.flat()

  leads.sort((a, b) => {
    const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0
    const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0
    return tb - ta
  })

  return { leads, skipped: false }
}

export async function syncMetaLeadsPreviewCache(
  supabase: SupabaseClient,
  organizationId: string,
  options: { daysBack?: number } = {}
) {
  const daysBack = options.daysBack ?? 90
  const fetched = await fetchAllMetaLeadsPreviewFromGraph(supabase, organizationId, { daysBack })
  if (fetched.skipped) {
    return {
      ...fetched,
      total: 0,
      syncedAt: null as string | null,
    }
  }

  const { added, total } = await mergeMetaLeadsPreviewCache(supabase, organizationId, {
    daysBack,
    leads: fetched.leads,
  })

  const meta = await getMetaLeadsPreviewCacheMeta(supabase, organizationId)
  return {
    skipped: false as const,
    added,
    total,
    syncedAt: meta?.syncedAt ?? new Date().toISOString(),
  }
}

export async function getMetaLeadsPreviewPage(
  supabase: SupabaseClient,
  organizationId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page, pageSize } = normalizePreviewPageOptions(options)
  const cacheMeta = await getMetaLeadsPreviewCacheMeta(supabase, organizationId)
  const { rows, total } = await listMetaLeadsPreviewFromCache(supabase, organizationId, {
    page,
    pageSize,
  })
  const hasMore = page * pageSize < total

  return {
    leads: rows,
    total,
    page,
    pageSize,
    hasMore,
    syncedAt: cacheMeta?.syncedAt ?? null,
    daysBack: cacheMeta?.daysBack ?? 90,
    skipped: false as const,
  }
}

export async function processMetaLeadgenWebhookEvent(
  supabase: SupabaseClient,
  input: { pageId: string; leadgenId: string; formId?: string | null }
) {
  const { getOrganizationIdByPageId } = await import("@/lib/db/meta-config-repository")
  const organizationId = await getOrganizationIdByPageId(supabase, input.pageId)
  if (!organizationId) {
    return {
      ok: false as const,
      statusCode: 404,
      error: `No organization for page ${input.pageId}`,
    }
  }

  const { token } = await resolvePageAccessTokenForOrganization(supabase, organizationId)

  let formId = input.formId?.trim() || null
  if (!formId) {
    try {
      const leadPreview = await fetchMetaLeadDetailsWithRetry(input.leadgenId, token)
      formId = leadPreview.form_id?.trim() || null
    } catch {
      formId = null
    }
  }

  if (!formId) {
    await logMetaLeadInboundEvent(supabase, {
      organizationId,
      metaFormId: null,
      metaLeadId: input.leadgenId,
      statusCode: 202,
      errorMessage: "Missing form_id — lead not ingested.",
    })
    return { ok: true as const, created: false, skipped: true, reason: "form_id_missing" }
  }

  let formRow = await getMetaLeadFormByMetaFormId(supabase, organizationId, formId)

  if (!formRow) {
    formRow = await upsertMetaLeadFormCatalogRow(supabase, {
      organizationId,
      metaFormId: formId,
      name: formId,
      status: "UNKNOWN",
    })
  }

  if (!formRow.enabled) {
    await logMetaLeadInboundEvent(supabase, {
      organizationId,
      metaFormId: formId,
      metaLeadId: input.leadgenId,
      statusCode: 202,
      errorMessage: "Form disabled — lead not ingested.",
    })
    return { ok: true as const, created: false, skipped: true, reason: "form_disabled" }
  }

  const mappingCheck = validateMetaFieldMappingForEnable(formRow.field_mapping ?? {})
  if (!mappingCheck.ok) {
    await logMetaLeadInboundEvent(supabase, {
      organizationId,
      metaFormId: formId,
      metaLeadId: input.leadgenId,
      statusCode: 422,
      errorMessage: "Form enabled but mapping incomplete — lead not ingested.",
    })
    return { ok: true as const, created: false, skipped: true, reason: "mapping_invalid" }
  }

  try {
    const result = await ingestMetaLeadById(supabase, organizationId, input.leadgenId, token, {
      fieldMapping: formRow.field_mapping ?? {},
      metaFormId: formId,
    })
    await logMetaLeadInboundEvent(supabase, {
      organizationId,
      metaFormId: formId,
      metaLeadId: input.leadgenId,
      statusCode: 201,
      payload: { leadId: result.leadId, created: result.created },
    })
    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed"
    await logMetaLeadInboundEvent(supabase, {
      organizationId,
      metaFormId: formId,
      metaLeadId: input.leadgenId,
      statusCode: 500,
      errorMessage: message,
    })
    return { ok: false as const, statusCode: 500, error: message }
  }
}

export async function fetchSampleLeadForForm(
  supabase: SupabaseClient,
  organizationId: string,
  metaFormId: string
) {
  const { token } = await resolvePageAccessTokenForOrganization(supabase, organizationId)
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${metaFormId}/leads?fields=id,created_time,field_data,ad_id&limit=1`
  const data = await graphFetch<{ data?: MetaLeadPayload[] }>(url, token)
  const lead = data.data?.[0]
  if (!lead) return null
  return fetchMetaLeadDetailsWithRetry(lead.id, token)
}

export async function getOrganizationIdFromSlug(supabase: SupabaseClient, slug: string) {
  const org = await getOrganizationBySlug(supabase, slug)
  return org?.id ?? null
}
