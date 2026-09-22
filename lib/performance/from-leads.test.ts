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
})
