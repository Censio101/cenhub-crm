export const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0"

export function normalizeMetaAccessToken(value: string): string {
  let token = String(value || "").trim()
  if (!token) return ""
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim()
  }
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim()
  }
  const urlTokenMatch = token.match(/(?:^|[?&])access_token=([^&]+)/i)
  if (urlTokenMatch) {
    try {
      token = decodeURIComponent(urlTokenMatch[1])
    } catch {
      token = urlTokenMatch[1]
    }
  }
  return token.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "")
}

export function validateMetaAccessToken(token: string): {
  ok: boolean
  token?: string
  reason?: string
} {
  const normalized = normalizeMetaAccessToken(token)
  if (!normalized) {
    return { ok: false, reason: "Missing Meta system user access token." }
  }
  if (/^\d{8,20}$/.test(normalized)) {
    return {
      ok: false,
      reason:
        "This looks like a Meta App ID or Ad Account ID, not an access token.",
    }
  }
  if (/^\d+\|/.test(normalized)) {
    return {
      ok: false,
      reason: "This looks like an App access token. Use a System User token instead.",
    }
  }
  if (normalized.length < 40) {
    return {
      ok: false,
      reason: "Meta access token is too short.",
    }
  }
  if (!/^EAA/i.test(normalized)) {
    return {
      ok: false,
      reason: "Meta System User token should start with EAA….",
    }
  }
  return { ok: true, token: normalized }
}

export function tokenHint(token: string): string | null {
  const normalized = normalizeMetaAccessToken(token)
  if (!normalized) return null
  if (normalized.length <= 8) return "***"
  return `${normalized.slice(0, 3)}…${normalized.slice(-4)} (${normalized.length} chars)`
}

function parseGraphError(body: { error?: { message?: string; code?: number } }, statusCode: number) {
  const message =
    body?.error?.message || `Graph API HTTP ${statusCode}`
  const code = body?.error?.code
  if (code === 190) return new Error(`Meta access token invalid or expired: ${message}`)
  if (/active access token must be used/i.test(message)) {
    return new Error(
      "Meta access token is missing or inactive. Check META_SYSTEM_USER_TOKEN_V2 on Vercel."
    )
  }
  if (code === 100 || code === 803) {
    return new Error(`Meta ad account not accessible: ${message}`)
  }
  if (code === 4 || code === 17 || code === 32) {
    return new Error(`Meta rate limit: ${message}`)
  }
  return new Error(message)
}

function appendAccessTokenToUrl(url: string, accessToken: string): string {
  const token = normalizeMetaAccessToken(accessToken)
  if (!token) {
    throw new Error("Missing Meta access token on Graph API request.")
  }
  if (/[?&]access_token=/i.test(url)) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}access_token=${encodeURIComponent(token)}`
}

export async function graphFetch<T = Record<string, unknown>>(
  url: string,
  accessToken: string
): Promise<T> {
  const fullUrl = appendAccessTokenToUrl(url, accessToken)
  const response = await fetch(fullUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number }
    data?: unknown[]
    paging?: { next?: string }
  }
  if (!response.ok || body.error) {
    throw parseGraphError(body, response.status)
  }
  return body as T
}

export async function fetchAllGraphPages<T>(
  firstUrl: string,
  accessToken: string,
  maxPages = 20
): Promise<T[]> {
  const items: T[] = []
  let url: string | null = firstUrl
  let pages = 0

  type GraphPage = { data?: T[]; paging?: { next?: string } }

  while (url && pages < maxPages) {
    const body: GraphPage = await graphFetch<GraphPage>(url, accessToken)
    items.push(...(body.data ?? []))
    url = body.paging?.next ?? null
    pages += 1
  }

  return items
}

export async function verifyMetaAccessToken(
  accessToken: string,
  options: { adAccountId?: string } = {}
): Promise<{ ok: boolean; token?: string; reason?: string }> {
  const check = validateMetaAccessToken(accessToken)
  if (!check.ok) return check

  const normalizedAdAccountId = String(options.adAccountId || "")
    .trim()
    .replace(/^act_/i, "")
  if (!normalizedAdAccountId) {
    return { ok: true, token: check.token }
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${normalizedAdAccountId}?fields=account_id,name`
  try {
    await graphFetch(url, check.token!)
    return { ok: true, token: check.token }
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : "Meta token verification failed.",
      token: check.token,
    }
  }
}

function resolveMetaEnvToken(): string {
  return (
    process.env.META_SYSTEM_USER_TOKEN_V2 ||
    process.env.META_SYSTEM_USER_TOKEN ||
    ""
  )
}

export type MetaTokenAccount = {
  metaSystemUserToken?: string | null
  metaPageAccessToken?: string | null
}

export function resolveMetaAccessToken(account: MetaTokenAccount = {}): {
  token: string
  source: "env" | "account" | "page" | "none"
  hint: string | null
  reason?: string
} {
  const pageToken = normalizeMetaAccessToken(account.metaPageAccessToken ?? "")
  if (pageToken) {
    const pageCheck = validateMetaAccessToken(pageToken)
    if (pageCheck.ok) {
      return { token: pageCheck.token!, source: "page", hint: tokenHint(pageCheck.token!) }
    }
  }

  const envToken = normalizeMetaAccessToken(resolveMetaEnvToken())
  const envCheck = envToken ? validateMetaAccessToken(envToken) : { ok: false as const }
  if (envCheck.ok) {
    return {
      token: envCheck.token!,
      source: "env",
      hint: tokenHint(envCheck.token!),
    }
  }

  const accountToken = normalizeMetaAccessToken(account.metaSystemUserToken ?? "")
  const accountCheck = accountToken
    ? validateMetaAccessToken(accountToken)
    : { ok: false as const }
  if (accountCheck.ok) {
    return {
      token: accountCheck.token!,
      source: "account",
      hint: tokenHint(accountCheck.token!),
    }
  }

  return {
    token: "",
    source: "none",
    hint: null,
    reason:
      envCheck.reason ||
      accountCheck.reason ||
      "Missing Meta system user token (set META_SYSTEM_USER_TOKEN_V2).",
  }
}
