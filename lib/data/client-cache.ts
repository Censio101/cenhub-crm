import type { Customer } from "@/lib/customers"
import type { Lead } from "@/lib/leads"

type LeadsCacheEntry = {
  leads: Lead[]
  source: "mock" | "supabase"
}

type CustomersCacheEntry = {
  customers: Customer[]
  source: "mock" | "supabase"
  organizationName: string | null
}

let leadsCache: LeadsCacheEntry | null = null
let customersCache: CustomersCacheEntry | null = null
let adSpendCache: Record<string, number> | null = null

export function getLeadsCache(): LeadsCacheEntry | null {
  return leadsCache
}

export function setLeadsCache(entry: LeadsCacheEntry) {
  leadsCache = entry
}

export function getAdSpendCache(): Record<string, number> | null {
  return adSpendCache
}

export function setAdSpendCache(adSpendByMonth: Record<string, number>) {
  adSpendCache = adSpendByMonth
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
