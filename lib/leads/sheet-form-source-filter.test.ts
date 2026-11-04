import { describe, expect, it } from "vitest"

import {
  distinctLeadFormSourceLabels,
  distinctLeadFormSourceLabelsFromConfig,
  leadFormSourceFilterOptions,
  shouldShowLeadFormSourceFilter,
  shouldShowLeadFormSourceFilterForSheet,
  shouldShowLeadFormSourceFilterFromConfig,
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

  it("shows filter from funnel config before leads are loaded", () => {
    const views = [
      { label: "Beregning", webhookFieldTargets: null },
      { label: "Quick-Heat Trailer", webhookFieldTargets: ["leadDate"] },
    ]
    expect(distinctLeadFormSourceLabelsFromConfig(views)).toEqual([
      "Beregning",
      "Quick-Heat Trailer",
    ])
    expect(shouldShowLeadFormSourceFilterFromConfig(views)).toBe(true)
    expect(shouldShowLeadFormSourceFilterForSheet(views, [])).toBe(true)
    expect(leadFormSourceFilterOptions(views, [])).toEqual([
      "Beregning",
      "Quick-Heat Trailer",
    ])
  })
})
