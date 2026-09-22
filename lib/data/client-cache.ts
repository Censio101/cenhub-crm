import type { Customer } from "@/lib/customers"
import type { Lead } from "@/lib/leads"

type LeadsCacheEntry = {
  leads: Lead[]
  source: "mock" | "supabase"
  organizationSlug?: string | null
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

export function getLeadsCache(): LeadsCacheEntry | null {
  return leadsCache
}

export function setLeadsCache(entry: LeadsCacheEntry) {
  leadsCache = entry
}

export function getAdSpendCache(): Record<string, number> | null {
  return adSpendCache?.adSpendByMonth ?? null
}

export function setAdSpendCache(
  adSpendByMonth: Record<string, number>,
  organizationSlug?: string | null
) {
  adSpendCache = { adSpendByMonth, organizationSlug }
}

export function hasLeadsCache(): boolean {
  return leadsCache !== null
}

export function getCustomersCache(): CustomersCacheEntry | null {
  return customersCache
}

export function setCustomersCache(entry: CustomersCacheEntry) {
  customersCache = entry
}

export function hasCustomersCache(): boolean {
  return customersCache !== null
}

export const CLIENT_ORG_CHANGED_EVENT = "crm-client-org-changed"

export function clearClientCaches() {
  leadsCache = null
  customersCache = null
  adSpendCache = null
}

export function emitClientOrgChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_ORG_CHANGED_EVENT))
  }
}
