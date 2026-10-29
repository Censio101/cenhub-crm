import { describe, expect, it } from "vitest"

import type { Lead } from "@/lib/leads"

import { dailyAdSpend, adSpendForRange } from "./ad-spend-for-range"
import { runConsistencyAudit } from "./consistency-check"
import { resolvePreset, toIsoDate } from "./date-ranges"
import { getPerformanceDashboard } from "./get-performance"

const NOW = new Date(2026, 9, 29, 12, 0, 0) // 29 Oct 2026

function lead(partial: Partial<Lead> & { id: string; date: string }): Lead {
  return {
    fullName: "Test",
    email: `${partial.id}@example.com`,
    phone: "1",
    segment: "b2c",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: [],
    service: "",
    platform: "meta",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
    ltv: null,
    source: "meta",
    lockedFields: [],
    customFields: {},
    ...partial,
  } as unknown as Lead
}

/**
 * Deliberately awkward data: two leads/customers on the same day with different services,
 * a lead split over two services, a lead with no service or funnel, leads only at the very end
 * of a month, a won lead whose won date differs from its intake date, and a future-dated lead.
 */
const LEADS: Lead[] = [
  lead({ id: "a1", date: "2026-10-05", serviceIds: ["vinduespuds"], status: "won", wonDate: "2026-10-12", salesPrice: 1000, profit: 400, ltv: 2000 }),
  lead({ id: "a2", date: "2026-10-12", serviceIds: ["fliserens"], status: "won", wonDate: "2026-10-12", salesPrice: 2000, profit: 800, ltv: 3000 }),
  lead({ id: "a3", date: "2026-10-12", serviceIds: ["vinduespuds", "fliserens"] }),
  lead({ id: "a4", date: "2026-10-28", serviceIds: [], platform: "" }),
  lead({ id: "b1", date: "2026-09-29", serviceIds: ["vinduespuds"] }),
  lead({ id: "b2", date: "2026-09-30", serviceIds: ["fliserens"], status: "won", salesPrice: 500, profit: 100, ltv: 700 }),
  lead({ id: "c1", date: "2026-07-14", serviceIds: ["fliserens"], status: "won", wonDate: "2026-08-02", salesPrice: 750, profit: 250, ltv: 0 }),
  lead({ id: "f1", date: "2026-12-20", serviceIds: ["vinduespuds"], status: "won", salesPrice: 9000, profit: 1, ltv: 1 }),
]

const AD_SPEND: Record<string, number> = {
  "2026-05": 3100, // months with ads but no leads at all
  "2026-07": 3100,
  "2026-08": 3100,
  "2026-09": 3000,
  "2026-10": 2900, // current month: month-to-date (29 days)
}

describe("dashboard consistency audit", () => {
  it("finds no mismatch between KPI cards, chart, comparison, filters and the year table", () => {
    const issues = runConsistencyAudit({ leads: LEADS, adSpendByMonth: AD_SPEND }, NOW)
    expect(issues).toEqual([])
  })
})

describe("daily ad spend", () => {
  it("gives every day of a completed month an equal share, even days without leads", () => {
    const range = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30, 23, 59, 59) }
    const daily = dailyAdSpend(range, AD_SPEND, NOW)
    expect(daily.size).toBe(30)
    expect(daily.get("2026-09-01")).toBeCloseTo(100, 6)
    expect(daily.get("2026-09-15")).toBeCloseTo(100, 6)
    expect([...daily.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(3000, 6)
  })

  it("splits the current month over the days elapsed and ignores future days", () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31, 23, 59, 59) }
    const daily = dailyAdSpend(range, AD_SPEND, NOW)
    expect(daily.size).toBe(29)
    expect(daily.has("2026-10-30")).toBe(false)
    expect([...daily.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(2900, 6)
    // A range that reaches into the future must not inflate the total.
    expect(adSpendForRange(AD_SPEND, range, NOW)["2026-10"]).toBeCloseTo(2900, 6)
  })

  it("counts only the days inside a range that cuts through a month", () => {
    const range = { start: new Date(2026, 8, 20), end: new Date(2026, 9, 10, 23, 59, 59) }
    const total = [...dailyAdSpend(range, AD_SPEND, NOW).values()].reduce((a, b) => a + b, 0)
    // 11 days of September (3000 / 30) + 10 days of October (2900 / 29)
    expect(total).toBeCloseTo(11 * 100 + 10 * 100, 6)
  })
})

describe("dashboard totals", () => {
  const input = { leads: LEADS, adSpendByMonth: AD_SPEND, now: NOW }

  it("shows last month's spend on every day, not only on the days with leads", () => {
    const range = resolvePreset("last_month", NOW)
    const data = getPerformanceDashboard({ range }, input, { now: NOW })
    expect(data.chart.current).toHaveLength(30)
    expect(data.chart.current.every((bucket) => bucket.adSpend > 0)).toBe(true)
    expect(data.chart.current.reduce((sum, bucket) => sum + bucket.adSpend, 0)).toBeCloseTo(
      data.current.totals.adSpend,
      6
    )
    expect(data.current.totals.adSpend).toBeCloseTo(3000, 6)
  })

  it("adds up several buckets on the same day (two customers, different services)", () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 29, 23, 59, 59) }
    const data = getPerformanceDashboard({ range }, input, { now: NOW })
    const day = data.chart.current.find((bucket) => bucket.start === "2026-10-12")
    expect(day?.customers).toBe(2)
    expect(day?.revenue).toBe(3000)
    expect(data.chart.current.reduce((sum, bucket) => sum + bucket.revenue, 0)).toBe(
      data.current.totals.revenue
    )
  })

  it("does not lose ad spend when a range cuts through months", () => {
    const range = { start: new Date(2026, 8, 20), end: new Date(2026, 9, 10, 23, 59, 59) }
    const data = getPerformanceDashboard({ range }, input, { now: NOW })
    expect(data.current.totals.adSpend).toBeCloseTo(2100, 6)
  })

  it("scales spend by the service's lead share and gives months without leads to nobody", () => {
    const range = { start: new Date(2026, 8, 1), end: new Date(2026, 9, 29, 23, 59, 59) }
    const all = getPerformanceDashboard({ range }, input, { now: NOW }).current.totals
    const windows = getPerformanceDashboard({ range, service: "vinduespuds" }, input, { now: NOW }).current.totals
    const tiles = getPerformanceDashboard({ range, service: "fliserens" }, input, { now: NOW }).current.totals
    expect(windows.adSpend + tiles.adSpend).toBeLessThanOrEqual(all.adSpend + 1e-6)
    expect(windows.adSpend).toBeGreaterThan(0)
    expect(tiles.adSpend).toBeGreaterThan(0)
  })

  it("uses the same dates for the independent recount as the engine (won date, not intake date)", () => {
    const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 31, 23, 59, 59) }
    const data = getPerformanceDashboard({ range }, input, { now: NOW })
    expect(toIsoDate(range.start)).toBe("2026-08-01")
    expect(data.current.totals.customers).toBe(1)
    expect(data.current.totals.revenue).toBe(750)
    expect(data.current.totals.leads).toBe(0)
  })
})
