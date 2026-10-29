import { fetchAllGraphPages, GRAPH_VERSION } from "@/lib/meta/token"

export type MetaPixel = {
  id: string
  name: string
  /** Meta marks datasets that already carry a CRM / lead-ads data source. */
  isCrm: boolean
  lastFiredTime: string | null
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { expiresAt: number; pixels: MetaPixel[] }>()

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

/** Pixels (datasets) the token can see on a client's ad account, for the settings dropdown. */
export async function fetchAdAccountPixels(
  adAccountId: string,
  accessToken: string,
  options?: { bypassCache?: boolean }
): Promise<MetaPixel[]> {
  const account = normalizeAdAccountId(adAccountId)
  if (!account) return []

  const now = Date.now()
  const cached = cache.get(account)
  if (!options?.bypassCache && cached && cached.expiresAt > now) return cached.pixels

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${account}/adspixels?fields=id,name,is_crm,last_fired_time&limit=100`
  const rows = await fetchAllGraphPages<Record<string, unknown>>(url, accessToken, 5)

  const pixels = rows
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      name: String(row.name ?? "").trim() || String(row.id ?? ""),
      isCrm: row.is_crm === true,
      lastFiredTime: typeof row.last_fired_time === "string" ? row.last_fired_time : null,
    }))
    .filter((pixel) => pixel.id)
    .sort((left, right) => left.name.localeCompare(right.name, "da"))

  cache.set(account, { expiresAt: now + CACHE_TTL_MS, pixels })
  return pixels
}
