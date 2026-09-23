import { fetchAllGraphPages, GRAPH_VERSION } from "@/lib/meta/token"

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

export async function discoverPageIdFromAdAccount(
  adAccountId: string,
  accessToken: string
): Promise<string | null> {
  const accountId = normalizeAdAccountId(adAccountId)
  if (!accountId) return null

  const adsUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/ads` +
    "?fields=creative{object_story_spec{page_id}}&limit=50"

  try {
    const ads = await fetchAllGraphPages<{
      creative?: { object_story_spec?: { page_id?: string } }
    }>(adsUrl, accessToken, 2)

    for (const ad of ads) {
      const pageId = String(ad.creative?.object_story_spec?.page_id || "").trim()
      if (pageId) return pageId
    }
  } catch {
    // fall through to leadgen forms lookup
  }

  const formsUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/leadgen_forms` +
    "?fields=page_id&limit=10"

  try {
    const forms = await fetchAllGraphPages<{ page_id?: string }>(formsUrl, accessToken, 1)
    for (const form of forms) {
      const pageId = String(form.page_id || "").trim()
      if (pageId) return pageId
    }
  } catch {
    // fall through to ad sets lookup
  }

  const adsetsUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/adsets` +
    "?fields=promoted_object{page_id}&limit=50"

  try {
    const adsets = await fetchAllGraphPages<{
      promoted_object?: { page_id?: string }
    }>(adsetsUrl, accessToken, 2)

    for (const adset of adsets) {
      const pageId = String(adset.promoted_object?.page_id || "").trim()
      if (pageId) return pageId
    }
  } catch {
    return null
  }

  return null
}
