import { differenceInCalendarDays } from "date-fns"
import { describe, expect, it } from "vitest"

import { alignByOffset, buildChartPoints } from "./compare"
import { previousPeriod, resolvePreset } from "./date-ranges"
import { getChartSeries, getPerformanceDashboard } from "./get-performance"
import { dashboardStateToParams, parseDashboardParams } from "./url-state"

describe("period comparison", () => {
  it("aligns series by offset rather than calendar date", () => {
    const aligned = alignByOffset(["jun", "jul"], ["jan", "feb", "mar"])
    expect(aligned).toEqual([
      { current: "jun", comparison: "jan" },
      { current: "jul", comparison: "feb" },
      { current: undefined, comparison: "mar" },
    ])
  })

  it("resolves the last 30 days as an inclusive 30-day window", () => {
    const now = new Date(2026, 8, 21, 15, 0, 0)
    const range = resolvePreset("last_30_days", now)
    expect(differenceInCalendarDays(range.end, range.start) + 1).toBe(30)
    expect(range.start.getDate()).toBe(23)
    expect(range.start.getMonth()).toBe(7)
  })

  it("reads and writes compare period URL state", () => {
    const parsed = parseDashboardParams(
      new URLSearchParams("preset=last_month&compare=previous")
    )
    expect(parsed.comparisonEnabled).toBe(true)
    expect(parsed.comparisonMode).toBe("previous_period")
    expect(parsed.comparisonRange).not.toBeNull()

    const query = dashboardStateToParams(parsed)
    expect(new URLSearchParams(query).get("compare")).toBe("previous")
    expect(new URLSearchParams(query).get("compareFrom")).toBeTruthy()
  })

  it("builds a previous period of equal length immediately before", () => {
    const range = {
      start: new Date(2026, 6, 1),
      end: new Date(2026, 11, 31),
    }
    const previous = previousPeriod(range)
    const currentDays = differenceInCalendarDays(range.end, range.start) + 1
    const previousDays =
      differenceInCalendarDays(previous.end, previous.start) + 1
    expect(previous.end.getTime()).toBeLessThan(range.start.getTime())
    expect(previousDays).toBe(currentDays)
  })

  it("overlays before/after months by index in the chart series", () => {
    const data = getPerformanceDashboard({
      range: {
        start: new Date(2026, 6, 1),
        end: new Date(2026, 11, 31),
      },
      comparison: {
        start: new Date(2026, 0, 1),
        end: new Date(2026, 5, 30),
      },
    })

    const points = buildChartPoints(
      "revenue",
      data.current.buckets,
      data.comparison?.buckets ?? null,
      data.granularity
    )

    expect(points.length).toBeGreaterThan(0)
    expect(points[0]?.current).not.toBeNull()
    expect(points[0]?.comparison).not.toBeNull()
    expect(points[0]?.label).toBe("Jul")
  })

  it("overlays ad spend on the revenue chart series", () => {
    const range = {
      start: new Date(2026, 6, 1),
      end: new Date(2026, 11, 31),
    }
    const data = getPerformanceDashboard({ range })
    const revenue = getChartSeries(data, "revenue")
    const leads = getChartSeries(data, "leads")

    expect(revenue[0]?.spend).toBeGreaterThan(0)
    expect(revenue[0]?.spend).not.toBe(revenue[0]?.current)
    expect(leads[0]?.spend).toBeUndefined()

    const meta = getChartSeries(
      getPerformanceDashboard({ range, funnel: "meta" }),
      "revenue"
    )
    expect(meta[0]?.spend).toBeGreaterThan(0)
    expect(meta[0]?.spend).toBeLessThan(revenue[0]?.spend ?? 0)
  })
})
