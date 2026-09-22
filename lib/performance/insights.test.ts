import { describe, expect, it } from "vitest"

import {
  computeLeadFunnel,
  filterDashboardLeads,
  getActionLeads,
  type Lead,
} from "@/lib/leads"
import { buildValueStory, computeRoas } from "./insights"
import type { PeriodTotals } from "./types"

const totals = (overrides: Partial<PeriodTotals> = {}): PeriodTotals => ({
  leads: 100,
  customers: 25,
  revenue: 200000,
  adSpend: 50000,
  profit: 150000,
  ...overrides,
})

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: "lead-x",
    date: "2026-09-10",
    fullName: "Test",
    email: "t@example.dk",
    phone: "20 00 00 00",
    segment: "b2c",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: ["renovering"],
    platform: "meta",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
    ...overrides,
  }
}

describe("value story", () => {
  it("computes ROAS as revenue divided by ad spend", () => {
    expect(computeRoas(totals())).toBe(4)
  })

  it("returns null ROAS when there is no spend", () => {
    expect(computeRoas(totals({ adSpend: 0 }))).toBeNull()
  })

  it("tells how many more customers and cheaper CPL vs comparison", () => {
    const story = buildValueStory(
      totals(),
      totals({ customers: 20, leads: 80, adSpend: 48000 })
    )
    expect(story.comparisonLines[0]).toContain("flere kunder")
    expect(story.comparisonLines.some((line) => line.startsWith("CPL"))).toBe(
      true
    )
  })
})

describe("lead funnel and actions", () => {
  const leads = [
    lead({ id: "1", status: "new_waiting_call" }),
    lead({ id: "2", status: "call_1" }),
    lead({ id: "3", status: "proposal_sent" }),
    lead({ id: "4", status: "won" }),
    lead({ id: "5", status: "client_waiting_on_us" }),
  ]

  it("counts how far leads have reached", () => {
    const steps = computeLeadFunnel(leads)
    expect(steps.map((step) => step.count)).toEqual([5, 4, 2, 1])
  })

  it("lists leads that need action", () => {
    expect(getActionLeads(leads).map((item) => item.id)).toEqual(["1", "5"])
  })

  it("filters leads by range and service", () => {
    const filtered = filterDashboardLeads(
      [
        lead({ id: "in", date: "2026-09-10", serviceIds: ["renovering"] }),
        lead({ id: "out", date: "2026-01-02", serviceIds: ["renovering"] }),
        lead({
          id: "other",
          date: "2026-09-10",
          serviceIds: ["tagdaekning"],
        }),
      ],
      {
        range: {
          start: new Date("2026-09-01T00:00:00"),
          end: new Date("2026-09-30T00:00:00"),
        },
        service: "renovering",
      }
    )
    expect(filtered.map((item) => item.id)).toEqual(["in"])
  })
})
