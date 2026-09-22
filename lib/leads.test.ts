import { describe, expect, it } from "vitest"

import { MOCK_CUSTOMERS } from "./customers"
import {
  MOCK_LEADS,
  previousLeadMonthKey,
  sortLeadsByDate,
} from "./leads"

describe("lead date helpers", () => {
  it("steps a month key back one month", () => {
    expect(previousLeadMonthKey("2026-01")).toBe("2025-12")
    expect(previousLeadMonthKey("2026-09")).toBe("2026-08")
  })

  it("sorts leads newest or oldest first", () => {
    const newest = sortLeadsByDate(MOCK_LEADS, "desc")
    const oldest = sortLeadsByDate(MOCK_LEADS, "asc")
    expect(newest[0]?.date >= newest.at(-1)?.date).toBe(true)
    expect(oldest[0]?.date <= oldest.at(-1)?.date).toBe(true)
    expect(newest[0]?.id).toBe(oldest.at(-1)?.id)
  })

  it("has enough template leads across several months", () => {
    const months = new Set(MOCK_LEADS.map((lead) => lead.date.slice(0, 7)))
    expect(MOCK_LEADS.length).toBeGreaterThanOrEqual(20)
    expect(months.size).toBeGreaterThanOrEqual(8)
  })
})

describe("template customers", () => {
  it("includes won leads plus extra demo customers", () => {
    expect(MOCK_CUSTOMERS.length).toBeGreaterThanOrEqual(20)
    expect(MOCK_CUSTOMERS.some((customer) => customer.city === "Helsingør")).toBe(
      true
    )
    expect(MOCK_CUSTOMERS.some((customer) => customer.segment === "b2b")).toBe(
      true
    )
    expect(MOCK_CUSTOMERS.some((customer) => customer.segment === "b2c")).toBe(
      true
    )
  })
})
