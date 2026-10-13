import { describe, expect, it } from "vitest"

import { applyPresetWithComparison } from "@/lib/performance/dashboard-view-mutations"
import { parseDashboardParams } from "@/lib/performance/url-state"

describe("applyPresetWithComparison", () => {
  it("enables previous-period comparison when leaving all time", () => {
    const view = parseDashboardParams(new URLSearchParams("preset=all_time"))
    const next = applyPresetWithComparison(view, "last_30_days", new Date("2024-06-01"))
    expect(next.preset).toBe("last_30_days")
    expect(next.comparisonEnabled).toBe(true)
    expect(next.comparisonMode).toBe("previous_period")
    expect(next.comparisonRange).not.toBeNull()
  })
})
