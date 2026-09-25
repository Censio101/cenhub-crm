import { fetchAllGraphPages, resolveMetaAccessToken, GRAPH_VERSION } from "@/lib/meta/token"

const MAX_PAGES = 20

function normalizeAdAccountId(value: string): string | null {
  const raw = String(value || "").trim().replace(/^act_/i, "")
  return raw || null
}

async function resolveBusinessId(accessToken: string): Promise<string | null> {
  const configured = String(process.env.META_BUSINESS_ID || "").trim()
  if (configured) return configured

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/businesses?fields=id,name&limit=25`
    const body = await fetchAllGraphPages<{ id: string; name?: string }>(url, accessToken, 1)
    if (body.length === 1) return body[0].id
    if (body.length > 1) {
      const named = body.find((row) => /censio|cenhub/i.test(String(row.name || "")))
      return (named ?? body[0]).id
    }
  } catch {
    // fall through
  }
  return null
}

type PartnerAccount = {
  metaAdAccountId: string
  accountName: string
  accountStatus: number | null
  currency: string
  source: string
}

function rowToPartnerAccount(
  row: Record<string, unknown>,
  source: string
): PartnerAccount | null {
  const accountId = normalizeAdAccountId(String(row.account_id ?? row.id ?? ""))
  if (!accountId) return null
  return {
    metaAdAccountId: accountId,
    accountName: String(row.name || accountId).trim(),
    accountStatus:
      row.account_status != null ? Number(row.account_status) : null,
    currency: String(row.currency || "DKK"),
    source,
  }
}

type PartnerFetchResult = {
  businessId: string | null
  accounts: PartnerAccount[]
  error: string | null
}

const PARTNER_CACHE_TTL_MS = 90_000
let partnerCache: { expiresAt: number; value: PartnerFetchResult } | null = null

export async function fetchPartnerAdAccounts(options?: {
  bypassCache?: boolean
}): Promise<PartnerFetchResult> {
  const now = Date.now()
  if (!options?.bypassCache && partnerCache && partnerCache.expiresAt > now) {
    return partnerCache.value
  }

  const resolved = resolveMetaAccessToken()
  if (!resolved.token) {
    return {
      businessId: null,
      accounts: [],
      error: resolved.reason ?? "Missing Meta system user token.",
    }
  }

  const businessId = await resolveBusinessId(resolved.token)
  if (!businessId) {
    return {
      businessId: null,
      accounts: [],
      error:
        "Set META_BUSINESS_ID in Vercel, or ensure the token can read /me/businesses.",
    }
  }

  const fields = "id,account_id,name,account_status,currency"
  const ownedUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${businessId}/owned_ad_accounts?fields=${fields}&limit=100`
  const clientUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${businessId}/client_ad_accounts?fields=${fields}&limit=100`

  try {
    const [owned, clients] = await Promise.all([
      fetchAllGraphPages<Record<string, unknown>>(ownedUrl, resolved.token, MAX_PAGES).catch(
        () => []
      ),
      fetchAllGraphPages<Record<string, unknown>>(clientUrl, resolved.token, MAX_PAGES).catch(
        () => []
      ),
    ])

    const byId = new Map<string, PartnerAccount>()
    for (const row of [...owned, ...clients]) {
      const account = rowToPartnerAccount(row, "partner")
      if (account) byId.set(account.metaAdAccountId, account)
    }

    const value: PartnerFetchResult = {
      businessId,
      accounts: [...byId.values()].sort((left, right) =>
        left.accountName.localeCompare(right.accountName, "da")
      ),
      error: null,
    }
    partnerCache = { expiresAt: now + PARTNER_CACHE_TTL_MS, value }
    return value
  } catch (error) {
    const value: PartnerFetchResult = {
      businessId,
      accounts: [],
      error: error instanceof Error ? error.message : "Could not fetch Meta ad accounts.",
    }
    return value
  }
}

export function clearPartnerAdAccountsCache() {
  partnerCache = null
}
