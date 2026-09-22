/**
 * Shared fake Meta ad spend until real Graph API sync (Phase 4).
 * Same monthly totals for every client org in demo mode.
 */
export type DemoAdSpendMonth = {
  monthKey: string
  spend: number
  clicks: number
  impressions: number
}

/** Mirrors the monthly ad spend curve from the original mock charts. */
export const DEMO_AD_SPEND_MONTHS: DemoAdSpendMonth[] = [
  { monthKey: "2024-01", spend: 12800, clicks: 820, impressions: 42000 },
  { monthKey: "2024-02", spend: 13000, clicks: 840, impressions: 43100 },
  { monthKey: "2024-03", spend: 13200, clicks: 860, impressions: 44200 },
  { monthKey: "2024-04", spend: 13600, clicks: 890, impressions: 45800 },
  { monthKey: "2024-05", spend: 13800, clicks: 910, impressions: 47100 },
  { monthKey: "2024-06", spend: 14000, clicks: 930, impressions: 48500 },
  { monthKey: "2024-07", spend: 13400, clicks: 880, impressions: 46200 },
  { monthKey: "2024-08", spend: 14100, clicks: 940, impressions: 49800 },
  { monthKey: "2024-09", spend: 14400, clicks: 960, impressions: 51200 },
  { monthKey: "2024-10", spend: 14800, clicks: 990, impressions: 52800 },
  { monthKey: "2024-11", spend: 16800, clicks: 1120, impressions: 60100 },
  { monthKey: "2024-12", spend: 15400, clicks: 1010, impressions: 55200 },
  { monthKey: "2025-01", spend: 16000, clicks: 1050, impressions: 57400 },
  { monthKey: "2025-02", spend: 16200, clicks: 1070, impressions: 58600 },
  { monthKey: "2025-03", spend: 16500, clicks: 1090, impressions: 59800 },
  { monthKey: "2025-04", spend: 17000, clicks: 1130, impressions: 62100 },
  { monthKey: "2025-05", spend: 17200, clicks: 1150, impressions: 63400 },
  { monthKey: "2025-06", spend: 17500, clicks: 1180, impressions: 64800 },
  { monthKey: "2025-07", spend: 16800, clicks: 1120, impressions: 61900 },
  { monthKey: "2025-08", spend: 17600, clicks: 1190, impressions: 65500 },
  { monthKey: "2025-09", spend: 18000, clicks: 1220, impressions: 67200 },
  { monthKey: "2025-10", spend: 18500, clicks: 1260, impressions: 69400 },
  { monthKey: "2025-11", spend: 21000, clicks: 1410, impressions: 78200 },
  { monthKey: "2025-12", spend: 19200, clicks: 1290, impressions: 71200 },
  { monthKey: "2026-01", spend: 18500, clicks: 1240, impressions: 68800 },
  { monthKey: "2026-02", spend: 19000, clicks: 1280, impressions: 70600 },
  { monthKey: "2026-03", spend: 19500, clicks: 1310, impressions: 72400 },
  { monthKey: "2026-04", spend: 21000, clicks: 1420, impressions: 78900 },
  { monthKey: "2026-05", spend: 20500, clicks: 1380, impressions: 76800 },
  { monthKey: "2026-06", spend: 21000, clicks: 1410, impressions: 78200 },
  { monthKey: "2026-07", spend: 21500, clicks: 1450, impressions: 80100 },
  { monthKey: "2026-08", spend: 22000, clicks: 1490, impressions: 82400 },
  { monthKey: "2026-09", spend: 23000, clicks: 1560, impressions: 86100 },
  { monthKey: "2026-10", spend: 24000, clicks: 1630, impressions: 89800 },
  { monthKey: "2026-11", spend: 28000, clicks: 1890, impressions: 104200 },
  { monthKey: "2026-12", spend: 25500, clicks: 1720, impressions: 95200 },
]

export function demoAdSpendByMonth(): Record<string, number> {
  return Object.fromEntries(
    DEMO_AD_SPEND_MONTHS.map((row) => [row.monthKey, row.spend])
  )
}

export function monthKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}
