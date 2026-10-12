import type { SupabaseClient } from "@supabase/supabase-js"

import { monthKeyFromDate } from "@/lib/performance/demo-ad-spend"

function adMetricRowSource(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const source = (payload as { source?: unknown }).source
  return typeof source === "string" ? source : null
}

/** Drop demo/future rows after a real Meta sync so they cannot skew the dashboard. */
export async function purgeStaleAdMetricsAfterMetaSync(
  supabase: SupabaseClient,
  organizationId: string,
  syncedMonths: readonly string[]
) {
  const syncedSet = new Set(syncedMonths)
  const currentKey = monthKeyFromDate(new Date().toISOString().slice(0, 10))
  const { data: rows, error: listError } = await supabase
    .from("client_ad_metrics")
    .select("id, month_key, payload")
    .eq("organization_id", organizationId)

  if (listError) throw listError

  const idsToDelete = (rows ?? [])
    .filter((row) => {
      const monthKey = String(row.month_key)
      if (syncedSet.has(monthKey)) return false
      if (monthKey > currentKey) return true
      return adMetricRowSource(row.payload) === "demo"
    })
    .map((row) => row.id as string)

  if (!idsToDelete.length) return 0

  const { error: deleteError } = await supabase
    .from("client_ad_metrics")
    .delete()
    .in("id", idsToDelete)

  if (deleteError) throw deleteError
  return idsToDelete.length
}

export async function listAdSpendByMonth(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ adSpendByMonth: Record<string, number>; source: "synced" | "demo" | "pending" }> {
  const { data: metaConfig } = await supabase
    .from("client_meta_config")
    .select("enabled")
    .eq("organization_id", organizationId)
    .maybeSingle()

  const { data, error } = await supabase
    .from("client_ad_metrics")
    .select("month_key, spend, payload")
    .eq("organization_id", organizationId)
    .order("month_key", { ascending: true })

  if (error) throw error

  const metaEnabled = Boolean(metaConfig?.enabled)
  const rows =
    data?.filter((row) => !metaEnabled || adMetricRowSource(row.payload) !== "demo") ?? []

  if (rows.length) {
    return {
      adSpendByMonth: Object.fromEntries(
        rows.map((row) => [row.month_key, Number(row.spend)])
      ),
      source: "synced",
    }
  }

  if (metaEnabled) {
    return { adSpendByMonth: {}, source: "pending" }
  }

  return { adSpendByMonth: {}, source: "pending" }
}

export async function upsertMonthlyAdMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Array<{
    month: string
    spend: number
    impressions: number
    clicks: number
    leadsCount?: number
  }>
) {
  if (!rows.length) return

  const payload = rows.map((row) => ({
    organization_id: organizationId,
    month_key: row.month,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    ...(row.leadsCount !== undefined ? { leads_count: row.leadsCount } : {}),
    payload: { source: "meta" },
    synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("client_ad_metrics")
    .upsert(payload, { onConflict: "organization_id,month_key" })

  if (error) throw error
}
