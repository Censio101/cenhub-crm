import { describe, expect, it } from "vitest"

import { emptyLead } from "@/lib/leads"
import { leadMatchesServiceFilter } from "@/lib/leads/service-filter"

describe("leadMatchesServiceFilter", () => {
  it("allows all when service filter is empty", () => {
    const lead = { ...emptyLead("1"), serviceIds: ["tagdaekning"] }
    expect(leadMatchesServiceFilter(lead, null)).toBe(true)
  })

  it("matches slug on serviceIds", () => {
    const lead = { ...emptyLead("1"), serviceIds: ["renovering", "tagdaekning"] }
    expect(leadMatchesServiceFilter(lead, "tagdaekning")).toBe(true)
    expect(leadMatchesServiceFilter(lead, "nybyg")).toBe(false)
  })

  it("matches legacy service field", () => {
    const lead = { ...emptyLead("1"), serviceIds: [], service: "badevaerelse" as const }
    expect(leadMatchesServiceFilter(lead, "badevaerelse")).toBe(true)
  })
})
