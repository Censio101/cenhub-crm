import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Limits for the public signup form, counted in the database (not in server memory), so they hold
 * across every Vercel server and survive restarts.
 *
 * Each accepted application stores a hash of the sender's IP (`submitter_ip_hash`) and a timestamp,
 * so "how many applications did this IP send in the last hour?" is a simple count.
 */
export const ONBOARDING_RATE_LIMITS = {
  windowMs: 60 * 60 * 1000,
  /** Applications one IP address may send per window. A real applicant sends one. */
  perIp: 3,
  /** Public-form applications from everyone per window; stops floods from many IPs. */
  global: 40,
} as const

export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number }

/** Pure decision, kept separate from the database lookups so it can be tested. */
export function evaluateOnboardingRateLimit(input: {
  now: number
  ipCount: number
  /** When the oldest application in the window from this IP was created (ms), if any. */
  oldestIpAt: number | null
  globalCount: number
  oldestGlobalAt: number | null
}): RateLimitDecision {
  const { windowMs, perIp, global } = ONBOARDING_RATE_LIMITS
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

async function recentApplications(
  supabase: SupabaseClient,
  sinceIso: string,
  filter: { ipHash?: string }
): Promise<{ count: number; oldestAt: number | null }> {
  let query = supabase
    .from("onboarding_applications")
    .select("created_at", { count: "exact" })
    .eq("source", "public_form")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(1)
  if (filter.ipHash) query = query.eq("submitter_ip_hash", filter.ipHash)

  const { data, count, error } = await query
  if (error) throw error
  const oldest = data?.[0]?.created_at
  return { count: count ?? 0, oldestAt: oldest ? new Date(oldest).getTime() : null }
}

/** Checks the per-IP and global limits for a new public application. */
export async function checkOnboardingRateLimit(
  supabase: SupabaseClient,
  ipHash: string,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  const sinceIso = new Date(now - ONBOARDING_RATE_LIMITS.windowMs).toISOString()
  const [ip, all] = await Promise.all([
    recentApplications(supabase, sinceIso, { ipHash }),
    recentApplications(supabase, sinceIso, {}),
  ])
  return evaluateOnboardingRateLimit({
    now,
    ipCount: ip.count,
    oldestIpAt: ip.oldestAt,
    globalCount: all.count,
    oldestGlobalAt: all.oldestAt,
  })
}
