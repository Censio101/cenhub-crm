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
