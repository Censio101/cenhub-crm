import type { SupabaseClient } from "@supabase/supabase-js"

export const BULK_LIST_ROUTES = ["leads", "customers"] as const
export type BulkListRoute = (typeof BULK_LIST_ROUTES)[number]

/**
 * Full-list fetches per signed-in user and org per minute.
 * High enough for live-sync refetches (500ms debounce); blocks scripted scraping.
 */
export const BULK_LIST_RATE_LIMITS = {
  windowMs: 60_000,
  perUserOrgRoute: 90,
  /** Log when usage reaches this fraction of the cap (defense-in-depth visibility). */
  warnAtFraction: 0.8,
} as const

export type BulkListRateLimitDecision = { allowed: boolean; retryAfterSeconds: number }

export function evaluateBulkListRateLimit(input: {
  now: number
  count: number
  oldestAt: number | null
}): BulkListRateLimitDecision {
  const { windowMs, perUserOrgRoute } = BULK_LIST_RATE_LIMITS
  if (input.count >= perUserOrgRoute) {
    const retryAfter = Math.max(
      1,
      Math.ceil(((input.oldestAt ?? input.now) + windowMs - input.now) / 1000)
    )
    return { allowed: false, retryAfterSeconds: retryAfter }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

async function recentReads(
  supabase: SupabaseClient,
  sinceIso: string,
  scope: { organizationId: string; userId: string; route: BulkListRoute }
): Promise<{ count: number; oldestAt: number | null }> {
  const { data, count, error } = await supabase
    .from("bulk_list_read_log")
    .select("created_at", { count: "exact" })
    .eq("organization_id", scope.organizationId)
    .eq("user_id", scope.userId)
    .eq("route", scope.route)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(1)

  if (error) throw error
  const oldest = data?.[0]?.created_at
  return { count: count ?? 0, oldestAt: oldest ? new Date(oldest).getTime() : null }
}

export async function consumeBulkListRateLimit(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    userId: string
    route: BulkListRoute
    now?: number
  }
): Promise<BulkListRateLimitDecision> {
  const now = input.now ?? Date.now()
  const sinceIso = new Date(now - BULK_LIST_RATE_LIMITS.windowMs).toISOString()
  const recent = await recentReads(supabase, sinceIso, {
    organizationId: input.organizationId,
    userId: input.userId,
    route: input.route,
  })
  const decision = evaluateBulkListRateLimit({
    now,
    count: recent.count,
    oldestAt: recent.oldestAt,
  })

  const warnThreshold = Math.floor(
    BULK_LIST_RATE_LIMITS.perUserOrgRoute * BULK_LIST_RATE_LIMITS.warnAtFraction
  )
  if (recent.count >= warnThreshold) {
    console.warn("[bulk-list-rate-limit] high read volume", {
      organizationId: input.organizationId,
      userId: input.userId,
      route: input.route,
      countInWindow: recent.count,
      cap: BULK_LIST_RATE_LIMITS.perUserOrgRoute,
    })
  }

  if (!decision.allowed) return decision

  const { error } = await supabase.from("bulk_list_read_log").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    route: input.route,
  })
  if (error) throw error
  return decision
}