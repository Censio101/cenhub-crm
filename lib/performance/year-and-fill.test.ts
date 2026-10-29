import { describe, expect, it } from "vitest"

import { fillBucketsForRange, getYearOverview } from "./get-performance"
import type { Lead } from "@/lib/leads"
import type { PerformanceBucket } from "./types"

function bucket(start: string, leads: number): PerformanceBucket {
  return {
    start,
    end: start,
    leads,
    customers: 0,
    revenue: 0,
    adSpend: 0,
  }
}

describe("fillBucketsForRange", () => {
  it("gives every day of a month a point, filling quiet days with zeros", () => {
    const range = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31) }
    const filled = fillBucketsForRange(
      [bucket("2026-01-05", 3), bucket("2026-01-20", 1)],
      range,
      "day",
      new Date(2026, 5, 1)
    )
    expect(filled).toHaveLength(31)
    expect(filled[4]?.leads).toBe(3)
    expect(filled[19]?.leads).toBe(1)
    expect(filled[0]?.leads).toBe(0)
  })

  it("stops at today so future days stay off the chart", () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) }
    const filled = fillBucketsForRange([], range, "day", new Date(2026, 9, 10, 12))
    expect(filled).toHaveLength(10)
  })

  it("fills months across a multi-month range", () => {
    const range = { start: new Date(2026, 0, 1), end: new Date(2026, 5, 30) }
    const filled = fillBucketsForRange([bucket("2026-03-01", 4)], range, "month", new Date(2026, 11, 1))
    expect(filled.map((item) => item.start)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
    ])
    expect(filled[2]?.leads).toBe(4)
  })

  it("returns nothing when the whole range is in the future", () => {
    const range = { start: new Date(2027, 0, 1), end: new Date(2027, 0, 31) }
    expect(fillBucketsForRange([], range, "day", new Date(2026, 5, 1))).toEqual([])
  })
})

describe("getYearOverview", () => {
  const lead = {
    id: "1",
    date: "2026-02-10",
    fullName: "Test",
    email: "t@t.dk",
    phone: "",
    segment: "",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: [],
    service: "",
    platform: "",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
    ltv: null,
    source: "meta",
    lockedFields: [],
    customFields: {},
  } as unknown as Lead

  it("always returns 12 months and flags months that have not started", () => {
    const overview = getYearOverview(
      2026,
      {},
      { leads: [lead], adSpendByMonth: {} },
      new Date(2026, 3, 15)
    )
    expect(overview.monthlyBuckets).toHaveLength(12)
    expect(overview.cumulativeBuckets).toHaveLength(12)
    expect(overview.monthlyBuckets[1]?.leads).toBe(1)
    expect(overview.monthlyBuckets[3]?.isFuture).toBeUndefined()
    expect(overview.monthlyBuckets[4]?.isFuture).toBe(true)
    expect(overview.cumulativeBuckets[11]?.leads).toBe(1)
    expect(overview.cumulativeBuckets[11]?.isFuture).toBe(true)
  })

  it("shows a full past year with no future months", () => {
    const overview = getYearOverview(
      2025,
      {},
      { leads: [], adSpendByMonth: {} },
      new Date(2026, 3, 15)
    )
    expect(overview.monthlyBuckets.every((month) => !month.isFuture)).toBe(true)
  })
})
