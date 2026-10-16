import type { Customer } from "@/lib/customers"
import type { Lead } from "@/lib/leads"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { clearInFlightRequests } from "@/lib/data/in-flight"

type LeadsCacheEntry = {
  leads: Lead[]
  source: "mock" | "supabase"
  organizationSlug?: string | null
  leadSheet?: ResolvedLeadSheetConfig | null
  cachedAt?: number
}

type CustomersCacheEntry = {
  customers: Customer[]
  source: "mock" | "supabase"
  organizationName: string | null
  organizationSlug?: string | null
  cachedAt?: number
}

type AdSpendCacheEntry = {
  adSpendByMonth: Record<string, number>
  organizationSlug?: string | null
  cachedAt?: number
}

/** Reuse in-memory workspace data when switching dashboard ↔ leads ↔ customers. */
export const WORKSPACE_CACHE_TTL_MS = 120_000

let leadsCache: LeadsCacheEntry | null = null
let customersCache: CustomersCacheEntry | null = null
let adSpendCache: AdSpendCacheEntry | null = null

/**
 * An entry belongs to `expectedSlug` unless both sides know a slug and they differ.
 * (Entries without a slug are still cleared by `clearClientCaches()` on every client switch.)
 */
export function cacheMatchesSlug(
  entrySlug: string | null | undefined,
  expectedSlug?: string | null
): boolean {
  if (!expectedSlug || !entrySlug) return true
  return entrySlug === expectedSlug
}

export function getLeadsCache(expectedSlug?: string | null): LeadsCacheEntry | null {
  if (leadsCache?.source === "mock") {
    leadsCache = null
    return null
  }
  if (leadsCache && !cacheMatchesSlug(leadsCache.organizationSlug, expectedSlug)) {
    return null
  }
  return leadsCache
}

export function setLeadsCache(entry: LeadsCacheEntry) {
  leadsCache = { ...entry, cachedAt: Date.now() }
}

/** Updates the cached leads after a local edit while keeping the entry's client slug. */
export function replaceCachedLeads(leads: Lead[], source: "mock" | "supabase") {
  leadsCache = {
    leadSheet: leadsCache?.leadSheet ?? null,
    organizationSlug: leadsCache?.organizationSlug ?? null,
    leads,
    source,
  }
}

export function getAdSpendCache(expectedSlug?: string | null): Record<string, number> | null {
  if (adSpendCache && !cacheMatchesSlug(adSpendCache.organizationSlug, expectedSlug)) {
    return null
  }
  return adSpendCache?.adSpendByMonth ?? null
}

export function setAdSpendCache(
  adSpendByMonth: Record<string, number>,
  organizationSlug?: string | null
) {
  adSpendCache = { adSpendByMonth, organizationSlug, cachedAt: Date.now() }
}

export function hasLeadsCache(expectedSlug?: string | null): boolean {
  return getLeadsCache(expectedSlug) !== null
}

export function hasFreshLeadsCache(
  expectedSlug?: string | null,
  maxAgeMs = WORKSPACE_CACHE_TTL_MS
): boolean {
  const entry = getLeadsCache(expectedSlug)
  if (!entry?.cachedAt) return false
  return Date.now() - entry.cachedAt <= maxAgeMs
}

export function hasFreshCustomersCache(
  expectedSlug?: string | null,
  maxAgeMs = WORKSPACE_CACHE_TTL_MS
): boolean {
  const entry = getCustomersCache(expectedSlug)
  if (!entry?.cachedAt) return false
  return Date.now() - entry.cachedAt <= maxAgeMs
}

export function hasFreshAdSpendCache(
  expectedSlug?: string | null,
  maxAgeMs = WORKSPACE_CACHE_TTL_MS
): boolean {
  const entry = adSpendCache
  if (!entry?.cachedAt || !cacheMatchesSlug(entry.organizationSlug, expectedSlug)) return false
  return Date.now() - entry.cachedAt <= maxAgeMs
}

export function getCustomersCache(
  expectedSlug?: string | null
): CustomersCacheEntry | null {
  if (customersCache?.source === "mock") {
    customersCache = null
    return null
  }
  if (customersCache && !cacheMatchesSlug(customersCache.organizationSlug, expectedSlug)) {
    return null
  }
  return customersCache
}

export function setCustomersCache(entry: CustomersCacheEntry) {
  customersCache = { ...entry, cachedAt: Date.now() }
}

export function hasCustomersCache(expectedSlug?: string | null): boolean {
  return getCustomersCache(expectedSlug) !== null
}

export const CLIENT_ORG_CHANGED_EVENT = "crm-client-org-changed"
/** Won customers list should reload after lead edits (server syncs customers from won leads). */
export const CLIENT_CUSTOMERS_REFRESH_EVENT = "crm-customers-refresh"
/** Dashboard should pick up lead sheet edits without a full page reload. */
export const CLIENT_LEADS_UPDATED_EVENT = "crm-leads-updated"

export function emitLeadsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_LEADS_UPDATED_EVENT))
  }
}

export function emitCustomersRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_CUSTOMERS_REFRESH_EVENT))
  }
}

const WORKSPACE_WARM_KEY = "crm-client-workspace-warm"

export function isClientWorkspaceWarm(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(WORKSPACE_WARM_KEY) === "1"
  } catch {
    return false
  }
}

export function markClientWorkspaceWarm() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(WORKSPACE_WARM_KEY, "1")
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearClientWorkspaceWarm() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(WORKSPACE_WARM_KEY)
  } catch {
    /* ignore */
  }
}

export function clearClientCaches() {
  leadsCache = null
  customersCache = null
  adSpendCache = null
  clearClientWorkspaceWarm()
  clearInFlightRequests()
}

export function emitClientOrgChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_ORG_CHANGED_EVENT))
  }
}
