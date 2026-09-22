import type { Lead } from "@/lib/leads"

type LeadsCacheEntry = {
  leads: Lead[]
  source: "mock" | "supabase"
}

let leadsCache: LeadsCacheEntry | null = null
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
