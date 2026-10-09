import { describe, expect, it } from "vitest"

import {
  countForGroup,
  defaultFilterForGroup,
  groupUnionFilter,
  matchesStatusFilter,
} from "@/lib/leads/status-filter-groups"

describe("status-filter-groups", () => {
  it("counts group totals", () => {
    const counts = { call_1: 2, call_2: 3, new_waiting_call: 1 }
    expect(countForGroup(counts, "calls")).toBe(5)
    expect(countForGroup(counts, "new")).toBe(1)
    expect(countForGroup(counts, "all")).toBe(6)
  })

  it("matches group union filter", () => {
    expect(matchesStatusFilter("call_3", groupUnionFilter("calls"))).toBe(true)
    expect(matchesStatusFilter("won", groupUnionFilter("calls"))).toBe(false)
  })

  it("defaultFilterForGroup uses single status or union", () => {
    expect(defaultFilterForGroup("new")).toBe("new_waiting_call")
    expect(defaultFilterForGroup("calls")).toBe("group:calls")
  })
})
