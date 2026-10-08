import { describe, expect, it } from "vitest"

import {
  adSpendForRange,
  metaMonthPeriodDays,
  monthKeysInRange,
  proratedMonthlySpend,
} from "./ad-spend-for-range"

describe("adSpendForRange", () => {
  const spend = { "2026-03": 31000, "2026-04": 30000 }

  it("lists months overlapping a custom range", () => {
    expect(
      monthKeysInRange({
        start: new Date("2026-03-10T00:00:00"),
        end: new Date("2026-04-05T00:00:00"),
      })
    ).toEqual(["2026-03", "2026-04"])
  })

  it("prorates spend for partial months in a completed month", () => {
    const ref = new Date("2026-04-15T12:00:00")
    const marchOnly = proratedMonthlySpend(
      "2026-03",
      31000,
      {
        start: new Date("2026-03-10T00:00:00"),
        end: new Date("2026-03-20T23:59:59"),
      },
      ref
    )
    expect(marchOnly).toBeGreaterThan(0)
    expect(marchOnly).toBeLessThan(31000)
  })

  it("does not under-count this month when Meta row is month-to-date", () => {
    const ref = new Date("2026-10-08T12:00:00")
    expect(metaMonthPeriodDays("2026-10", ref)).toBe(8)
    const thisMonth = proratedMonthlySpend(
      "2026-10",
      5000,
      {
        start: new Date("2026-10-01T00:00:00"),
        end: new Date("2026-10-08T23:59:59"),
      },
      ref
    )
    expect(thisMonth).toBe(5000)
  })

  it("sums prorated months in range", () => {
    const mapped = adSpendForRange(spend, {
      start: new Date("2026-03-01T00:00:00"),
      end: new Date("2026-04-30T23:59:59"),
    })
    expect(mapped["2026-03"]).toBe(31000)
    expect(mapped["2026-04"]).toBe(30000)
  })
})
