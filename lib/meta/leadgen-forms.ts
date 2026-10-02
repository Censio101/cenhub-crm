import { fetchAllGraphPages, graphFetch, GRAPH_VERSION } from "@/lib/meta/token"

export type LeadgenFormSummary = {
  id: string
  name?: string
  status?: string
  leads_count?: number
}

export type LeadgenFormQuestion = {
  id?: string
  key?: string
  label?: string
  type?: string
}

export async function listLeadgenForms(
  pageId: string,
  pageAccessToken: string
): Promise<LeadgenFormSummary[]> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/leadgen_forms?fields=id,name,status,leads_count`
  return fetchAllGraphPages<LeadgenFormSummary>(url, pageAccessToken)
}

export async function getLeadgenFormQuestions(
  formId: string,
  pageAccessToken: string
): Promise<{ id: string; name?: string; questions: LeadgenFormQuestion[] }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${formId}?fields=id,name,questions`
  const data = await graphFetch<{
    id: string
    name?: string
    questions?: LeadgenFormQuestion[]
  }>(url, pageAccessToken)
  return {
    id: data.id,
    name: data.name,
    questions: data.questions ?? [],
  }
}

export async function getPageSubscriptionStatus(pageId: string, pageAccessToken: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/subscribed_apps`
  const data = await graphFetch<{
    data?: Array<{ id?: string; name?: string; subscribed_fields?: string[] }>
  }>(url, pageAccessToken)
  return data.data ?? []
}

export async function subscribePageToLeadgenWebhooks(pageId: string, pageAccessToken: string) {
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/subscribed_apps` +
    `?subscribed_fields=leadgen&access_token=${encodeURIComponent(pageAccessToken)}`
  const response = await fetch(url, { method: "POST" })
  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean
    error?: { message?: string }
  }
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Failed to subscribe Page to leadgen webhooks.")
  }
  return body
}

export function collectLeadGenFormIdsFromGraphPayload(
  payload: unknown,
  formIds: Set<string> = new Set()
): Set<string> {
  if (!payload || typeof payload !== "object") return formIds
  if (Array.isArray(payload)) {
    for (const item of payload) collectLeadGenFormIdsFromGraphPayload(item, formIds)
    return formIds
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (key === "lead_gen_form_id" && (typeof value === "string" || typeof value === "number")) {
      formIds.add(String(value))
    } else {
      collectLeadGenFormIdsFromGraphPayload(value, formIds)
    }
  }
  return formIds
}

/** Best-effort: Meta instant form ids on ads with effective_status ACTIVE in the linked ad account. */
export async function findLeadgenFormIdsInActiveAds(
  adAccountId: string,
  accessToken: string
): Promise<Set<string>> {
  const normalized = adAccountId.replace(/^act_/i, "")
  const formIds = new Set<string>()
  const creativeFields =
    "creative{id,object_story_spec,asset_feed_spec,effective_object_story_id,object_type}"
  const adsUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${normalized}/ads` +
    `?fields=id,name,effective_status,${creativeFields}` +
    "&effective_status=['ACTIVE']&limit=100"

  try {
    const ads = await fetchAllGraphPages<Record<string, unknown>>(adsUrl, accessToken, 10)
    for (const ad of ads) {
      collectLeadGenFormIdsFromGraphPayload(ad, formIds)
    }
  } catch {
    // Graph shape varies; ads scan is best-effort only
  }

  return formIds
}
