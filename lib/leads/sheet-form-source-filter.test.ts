import { describe, expect, it } from "vitest"

import {
  distinctLeadFormSourceLabels,
  shouldShowLeadFormSourceFilter,
} from "@/lib/leads/sheet-form-source-filter"

describe("sheet-form-source-filter", () => {
  it("collects distinct labels", () => {
    expect(
      distinctLeadFormSourceLabels([
        { funnelSourceLabel: "Beregning" },
        { funnelSourceLabel: "Quick-Heat Trailer" },
        { funnelSourceLabel: "Beregning" },
      ])
    ).toEqual(["Beregning", "Quick-Heat Trailer"])
  })

  it("shows filter when two or more form sources exist", () => {
    expect(shouldShowLeadFormSourceFilter([{ funnelSourceLabel: "A" }])).toBe(false)
    expect(
      shouldShowLeadFormSourceFilter([
        { funnelSourceLabel: "A" },
        { funnelSourceLabel: "B" },
      ])
    ).toBe(true)
  })
})
