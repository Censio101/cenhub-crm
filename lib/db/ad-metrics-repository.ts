import type { SupabaseClient } from "@supabase/supabase-js"

import { demoAdSpendByMonth } from "@/lib/performance/demo-ad-spend"

export async function listAdSpendByMonth(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("client_ad_metrics")
    .select("month_key, spend")
    .eq("organization_id", organizationId)
    .order("month_key", { ascending: true })

  if (error) throw error

  if (!data?.length) {
    return demoAdSpendByMonth()
  }

  return Object.fromEntries(
    data.map((row) => [row.month_key, Number(row.spend)])
  )
}

export function listDemoAdSpendByMonth(): Record<string, number> {
  return demoAdSpendByMonth()
}

export async function upsertMonthlyAdMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Array<{
    month: string
    spend: number
    impressions: number
    clicks: number
  }>
) {
  if (!rows.length) return

  const payload = rows.map((row) => ({
    organization_id: organizationId,
    month_key: row.month,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("client_ad_metrics")
    .upsert(payload, { onConflict: "organization_id,month_key" })

  if (error) throw error
}
