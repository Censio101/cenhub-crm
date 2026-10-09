import { describe, expect, it } from "vitest"

import { previousComparisonMessageKey } from "./comparison-labels"
import { resolvePreset } from "./date-ranges"

describe("previousComparisonMessageKey", () => {
  const now = new Date(2026, 9, 9, 12, 0, 0)

  it("uses previous month for last month and this month presets", () => {
    expect(previousComparisonMessageKey(resolvePreset("last_month", now), "last_month")).toBe(
      "comparePreviousMonth"
    )
    expect(previousComparisonMessageKey(resolvePreset("this_month", now), "this_month")).toBe(
      "comparePreviousMonth"
    )
  })

  it("uses previous 30 days for the rolling window preset", () => {
    expect(previousComparisonMessageKey(resolvePreset("last_30_days", now), "last_30_days")).toBe(
      "comparePrevious30Days"
    )
  })

  it("uses previous period for multi-month ranges", () => {
    const range = resolvePreset("last_3_months", now)
    expect(previousComparisonMessageKey(range, "last_3_months")).toBe("comparePreviousPeriod")
  })
})
