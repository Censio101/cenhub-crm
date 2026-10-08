import type { Customer } from "@/lib/customers"
import type { Lead } from "@/lib/leads"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { clearInFlightRequests } from "@/lib/data/in-flight"

type LeadsCacheEntry = {
  leads: Lead[]
  source: "mock" | "supabase"
  organizationSlug?: string | null
  leadSheet?: ResolvedLeadSheetConfig | null
}

type CustomersCacheEntry = {
  customers: Customer[]
  source: "mock" | "supabase"
  organizationName: string | null
  organizationSlug?: string | null
}

type AdSpendCacheEntry = {
  adSpendByMonth: Record<string, number>
  organizationSlug?: string | null
}

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
  leadsCache = entry
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
  adSpendCache = { adSpendByMonth, organizationSlug }
}

export function hasLeadsCache(expectedSlug?: string | null): boolean {
  return getLeadsCache(expectedSlug) !== null
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
  customersCache = entry
}

export function hasCustomersCache(expectedSlug?: string | null): boolean {
  return getCustomersCache(expectedSlug) !== null
}

export const CLIENT_ORG_CHANGED_EVENT = "crm-client-org-changed"

export function clearClientCaches() {
  leadsCache = null
  customersCache = null
  adSpendCache = null
  clearInFlightRequests()
}

export function emitClientOrgChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_ORG_CHANGED_EVENT))
  }
}
