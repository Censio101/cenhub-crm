import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { upsertMonthlyAdMetrics } from "@/lib/db/ad-metrics-repository"
import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import { leadToInsertRow } from "@/lib/db/lead-mapper"
import type { LeadRow } from "@/lib/db/types"
import { MOCK_LEADS, type Lead } from "@/lib/leads"
import {
  DEMO_AD_SPEND_MONTHS,
  type DemoAdSpendMonth,
} from "@/lib/performance/demo-ad-spend"

/** Months of fake leads + ad spend when demo mode is enabled. */
export const DEMO_SEED_MONTH_COUNT = 5

export type DemoSeedResult = {
  leadsCount: number
  monthKeys: string[]
  adMetricsMonths: number
}

export function getRecentMonthKeys(
  count = DEMO_SEED_MONTH_COUNT,
  referenceDate = new Date()
): string[] {
  const cursor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  )
  const keys: string[] = []

  for (let index = 0; index < count; index += 1) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, "0")
    keys.unshift(`${year}-${month}`)
    cursor.setMonth(cursor.getMonth() - 1)
  }

  return keys
}

function demoAdSpendForMonth(monthKey: string): DemoAdSpendMonth {
  const exact = DEMO_AD_SPEND_MONTHS.find((row) => row.monthKey === monthKey)
  if (exact) return exact
  return DEMO_AD_SPEND_MONTHS[DEMO_AD_SPEND_MONTHS.length - 1]
}

export function pickDemoSeedLeads(monthKeys: readonly string[]): Lead[] {
  const allowed = new Set(monthKeys)
  const filtered = MOCK_LEADS.filter((lead) => allowed.has(lead.date.slice(0, 7)))
  if (filtered.length >= 10) return filtered
  return MOCK_LEADS
}

export async function clearDemoOrganizationData(
  supabase: SupabaseClient,
  organizationId: string,
  monthKeys?: readonly string[]
): Promise<void> {
  const { error: leadsError } = await supabase
    .from("leads")
    .delete()
    .eq("organization_id", organizationId)
    .eq("source", "demo")

  if (leadsError) throw leadsError

  const keys = monthKeys ?? getRecentMonthKeys()
  if (keys.length === 0) return

  const { error: metricsError } = await supabase
    .from("client_ad_metrics")
    .delete()
    .eq("organization_id", organizationId)
    .in("month_key", [...keys])

  if (metricsError) throw metricsError
}

export async function seedDemoOrganizationData(
  supabase: SupabaseClient,
  organizationId: string,
  options: { monthCount?: number; referenceDate?: Date } = {}
): Promise<DemoSeedResult> {
  const monthKeys = getRecentMonthKeys(
    options.monthCount ?? DEMO_SEED_MONTH_COUNT,
    options.referenceDate ?? new Date()
  )
  const seedLeads = pickDemoSeedLeads(monthKeys)

  await clearDemoOrganizationData(supabase, organizationId, monthKeys)

  const insertRows = seedLeads.map((lead) =>
    leadToInsertRow({ ...lead, id: randomUUID() }, organizationId, "demo")
  )

  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert(insertRows)
    .select("*")

  if (insertError) throw insertError

  const rows = (inserted ?? []) as LeadRow[]
  for (const row of rows) {
    if (row.status === "won") {
      await syncCustomerForWonLead(supabase, row)
    }
  }

  const leadsByMonth = new Map<string, number>()
  for (const row of rows) {
    const key = row.lead_date.slice(0, 7)
    leadsByMonth.set(key, (leadsByMonth.get(key) ?? 0) + 1)
  }

  const adRows = monthKeys.map((monthKey) => {
    const demo = demoAdSpendForMonth(monthKey)
    return {
      month: monthKey,
      spend: demo.spend,
      impressions: demo.impressions,
      clicks: demo.clicks,
      leadsCount: leadsByMonth.get(monthKey) ?? 0,
    }
  })

  await upsertMonthlyAdMetrics(supabase, organizationId, adRows)

  return {
    leadsCount: rows.length,
    monthKeys,
    adMetricsMonths: adRows.length,
  }
}
