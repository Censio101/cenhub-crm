import { describe, expect, it } from "vitest"

import { MOCK_LEADS } from "@/lib/leads"

import { demoAdSpendByMonth } from "./demo-ad-spend"
import { buildDailyBucketsFromLeads } from "./from-leads"
import { getPerformanceDashboard } from "./get-performance"
import { sumTotals } from "./metrics"

describe("buildDailyBucketsFromLeads", () => {
  it("derives revenue and customers from won leads", () => {
    const buckets = buildDailyBucketsFromLeads(MOCK_LEADS, demoAdSpendByMonth())
    const totals = sumTotals(buckets)
    const won = MOCK_LEADS.filter((lead) => lead.status === "won")

    expect(totals.leads).toBeGreaterThan(0)
    expect(totals.customers).toBe(won.length)
    expect(totals.revenue).toBeGreaterThan(0)
    expect(totals.adSpend).toBeGreaterThan(0)
  })

  it("powers the dashboard from lead data instead of mock charts", () => {
    const range = {
      start: new Date("2026-01-01T00:00:00"),
      end: new Date("2026-12-31T00:00:00"),
    }
    const data = getPerformanceDashboard(
      { range },
      { leads: MOCK_LEADS, adSpendByMonth: demoAdSpendByMonth() }
    )

    expect(data.current.totals.leads).toBeGreaterThan(0)
    expect(data.current.totals.adSpend).toBeGreaterThan(0)
  })

  it("includes synced Meta spend when there are no leads in range", () => {
    const range = {
      start: new Date("2026-03-01T00:00:00"),
      end: new Date("2026-04-30T23:59:59"),
    }
    const data = getPerformanceDashboard(
      { range },
      {
        leads: [],
        adSpendByMonth: { "2026-03": 10_000, "2026-04": 12_000 },
      }
    )

    expect(data.current.totals.leads).toBe(0)
    expect(data.current.totals.adSpend).toBe(22_000)
    expect(data.status).toBe("ok")
  })

  it("prorates ad spend for a custom partial month", () => {
    const range = {
      start: new Date("2026-03-10T00:00:00"),
      end: new Date("2026-03-20T23:59:59"),
    }
    const data = getPerformanceDashboard(
      { range },
      { leads: [], adSpendByMonth: { "2026-03": 31_000 } }
    )

    expect(data.current.totals.adSpend).toBeGreaterThan(0)
    expect(data.current.totals.adSpend).toBeLessThan(31_000)
  })
})
