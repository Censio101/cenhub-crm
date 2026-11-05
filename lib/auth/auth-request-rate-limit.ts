import type { SupabaseClient } from "@supabase/supabase-js"

export const AUTH_REQUEST_KINDS = ["magiclink", "recovery", "redeem_invite"] as const
export type AuthRequestKind = (typeof AUTH_REQUEST_KINDS)[number]

export const AUTH_RATE_LIMITS = {
  windowMs: 60 * 60 * 1000,
  perIp: 10,
  global: 80,
} as const

export type AuthRateLimitDecision = { allowed: boolean; retryAfterSeconds: number }

export function evaluateAuthRateLimit(input: {
  now: number
  ipCount: number
  oldestIpAt: number | null
  globalCount: number
  oldestGlobalAt: number | null
}): AuthRateLimitDecision {
  const { windowMs, perIp, global } = AUTH_RATE_LIMITS
  const retryAfter = (oldest: number | null) =>
    Math.max(1, Math.ceil(((oldest ?? input.now) + windowMs - input.now) / 1000))

  if (input.ipCount >= perIp) {
    return { allowed: false, retryAfterSeconds: retryAfter(input.oldestIpAt) }
  }
  if (input.globalCount >= global) {
    return { allowed: false, retryAfterSeconds: retryAfter(input.oldestGlobalAt) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

async function recentAuthRequests(
  supabase: SupabaseClient,
  sinceIso: string,
  kind: AuthRequestKind,
  ipHash?: string
): Promise<{ count: number; oldestAt: number | null }> {
  let query = supabase
    .from("auth_request_log")
    .select("created_at", { count: "exact" })
    .eq("kind", kind)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(1)
  if (ipHash) query = query.eq("ip_hash", ipHash)

  const { data, count, error } = await query
  if (error) throw error
  const oldest = data?.[0]?.created_at
  return { count: count ?? 0, oldestAt: oldest ? new Date(oldest).getTime() : null }
}

/** Counts recent public auth attempts in the database, then records this one if it is allowed. */
export async function consumeAuthRateLimit(
  supabase: SupabaseClient,
  input: { kind: AuthRequestKind; ipHash: string; now?: number }
): Promise<AuthRateLimitDecision> {
  const now = input.now ?? Date.now()
  const sinceIso = new Date(now - AUTH_RATE_LIMITS.windowMs).toISOString()
  const [ip, all] = await Promise.all([
    recentAuthRequests(supabase, sinceIso, input.kind, input.ipHash),
    recentAuthRequests(supabase, sinceIso, input.kind),
  ])
  const decision = evaluateAuthRateLimit({
    now,
    ipCount: ip.count,
    oldestIpAt: ip.oldestAt,
    globalCount: all.count,
    oldestGlobalAt: all.oldestAt,
  })
  if (!decision.allowed) return decision

  const { error } = await supabase.from("auth_request_log").insert({
    kind: input.kind,
    ip_hash: input.ipHash,
  })
  if (error) throw error
  return decision
}
