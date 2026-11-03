import { describe, expect, it } from "vitest"

import {
  shouldShowCustomerSourceFilter,
  shouldShowLeadSourceFilter,
  shouldShowServiceFilter,
} from "@/lib/leads/sheet-filter-visibility"

describe("shouldShowServiceFilter", () => {
  it("hides until loaded and when the list is empty", () => {
    expect(shouldShowServiceFilter(false, [{ id: "a" }])).toBe(false)
    expect(shouldShowServiceFilter(true, [])).toBe(false)
    expect(shouldShowServiceFilter(true, [{ id: "a" }])).toBe(true)
  })
})

describe("shouldShowLeadSourceFilter", () => {
  it("hides for zero or one platform", () => {
    expect(shouldShowLeadSourceFilter([])).toBe(false)
    expect(shouldShowLeadSourceFilter([{ platform: "" }, { platform: "website" }])).toBe(false)
    expect(
      shouldShowLeadSourceFilter([
        { platform: "website" },
        { platform: "website" },
      ])
    ).toBe(false)
  })

  it("shows when two or more platforms appear", () => {
    expect(
      shouldShowLeadSourceFilter([
        { platform: "website" },
        { platform: "meta" },
      ])
    ).toBe(true)
  })
})

describe("shouldShowCustomerSourceFilter", () => {
  it("mirrors lead source rules on customer sources", () => {
    expect(shouldShowCustomerSourceFilter([{ source: "website" }])).toBe(false)
    expect(
      shouldShowCustomerSourceFilter([
        { source: "website" },
        { source: "landing" },
      ])
    ).toBe(true)
  })
})
