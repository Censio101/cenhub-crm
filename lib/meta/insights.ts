import { graphFetch } from "@/lib/meta/token"

const INSIGHT_FIELDS =
  "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,date_start,date_stop"
const MAX_PAGING_PAGES = 20

export type MonthlyInsight = {
  month: string
  spend: number
  impressions: number
  clicks: number
}

function monthKeyFromDate(value: string): string | null {
  const match = String(value || "").match(/^(\d{4}-\d{2})/)
  return match ? match[1] : null
}

function parseAmount(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? "0"))
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeMetaAdAccountId(value: string): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null
  return raw.replace(/^act_/i, "")
}

function insightRowToMonthly(row: Record<string, unknown>): MonthlyInsight | null {
  const month = row.date_start ? monthKeyFromDate(String(row.date_start)) : null
  if (!month) return null
  return {
    month,
    spend: parseAmount(row.spend),
    impressions: parseAmount(row.impressions),
    clicks: parseAmount(row.clicks),
  }
}

export async function fetchMonthlyInsights(
  adAccountId: string,
  accessToken: string
): Promise<MonthlyInsight[]> {
  const id = normalizeMetaAdAccountId(adAccountId)
  if (!id) throw new Error("Meta ad account ID is required.")

  let url: string | null = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v21.0"}/act_${id}/insights?fields=${INSIGHT_FIELDS}&time_increment=monthly&date_preset=maximum`
  const rows: MonthlyInsight[] = []
  let pages = 0

  type InsightsPage = {
    data?: Record<string, unknown>[]
    paging?: { next?: string }
  }

  while (url && pages < MAX_PAGING_PAGES) {
    const body: InsightsPage = await graphFetch<InsightsPage>(url, accessToken)

    for (const row of body.data ?? []) {
      const monthly = insightRowToMonthly(row)
      if (monthly) rows.push(monthly)
    }

    url = body.paging?.next ?? null
    pages += 1
  }

  return rows
}
