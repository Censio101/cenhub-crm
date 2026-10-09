import { describe, expect, it } from "vitest"

import { isDashboardComparisonAvailable } from "./comparison-availability"
import { resolvePreset } from "./date-ranges"

describe("isDashboardComparisonAvailable", () => {
  const now = new Date(2026, 9, 9, 12, 0, 0)
  const anchor = new Date(2024, 2, 15)

  it("blocks all time", () => {
    const range = resolvePreset("all_time", now)
    expect(isDashboardComparisonAvailable("all_time", range, anchor, now)).toBe(false)
  })

  it("blocks custom range from first lead through today", () => {
    const range = { start: anchor, end: now }
    expect(isDashboardComparisonAvailable("custom", range, anchor, now)).toBe(false)
  })

  it("allows a bounded preset", () => {
    const range = resolvePreset("last_30_days", now)
    expect(isDashboardComparisonAvailable("last_30_days", range, anchor, now)).toBe(true)
  })

  it("allows custom range that ends before today", () => {
    const range = {
      start: anchor,
      end: new Date(2026, 5, 30),
    }
    expect(isDashboardComparisonAvailable("custom", range, anchor, now)).toBe(true)
  })
})
