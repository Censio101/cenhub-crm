import { describe, expect, it } from "vitest"

import { buildKpiLayout, parseHiddenMetrics } from "./visible-metrics"

function describeLayout(hidden: Parameters<typeof buildKpiLayout>[0]) {
  return buildKpiLayout(hidden).map((card) =>
    card.kind === "single" ? card.id : card.ids.join("+")
  )
}

describe("parseHiddenMetrics", () => {
  it("keeps only hideable metric ids", () => {
    expect(parseHiddenMetrics(["profit", "revenue", "nope", "profit"])).toEqual(["profit"])
  })

  it("returns an empty list for non-arrays", () => {
    expect(parseHiddenMetrics(undefined)).toEqual([])
    expect(parseHiddenMetrics(null)).toEqual([])
    expect(parseHiddenMetrics("profit")).toEqual([])
  })
})

describe("buildKpiLayout", () => {
  it("merges CPL + Leads and LTV + CAC when all 10 metrics are visible", () => {
    expect(describeLayout([])).toEqual([
      "revenue",
      "profit",
      "roas",
      "customers",
      "adSpend",
      "closeRate",
      "cpl+leads",
      "ltv+cac",
    ])
  })

  it("separates LTV and CAC first when POAS is hidden", () => {
    expect(describeLayout(["profit"])).toEqual([
      "revenue",
      "roas",
      "customers",
      "adSpend",
      "closeRate",
      "cpl+leads",
      "ltv",
      "cac",
    ])
  })

  it("separates CPL and Leads too once only 8 metrics remain", () => {
    const cards = buildKpiLayout(["profit", "adSpend"] as never)
    expect(cards.every((card) => card.kind === "single")).toBe(true)
    expect(cards).toHaveLength(8)
  })
})
