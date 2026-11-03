import { describe, expect, it } from "vitest"

import type { LeadFunnelRow } from "@/lib/db/types"
import type { Lead } from "@/lib/leads"

import { applyFunnelDefaultSegment } from "@/lib/leads/funnel-default-segment"

function funnel(segment: "b2b" | "b2c" | null): LeadFunnelRow {
  return { default_segment: segment } as LeadFunnelRow
}

function lead(segment: Lead["segment"]): Lead {
  return { segment } as Lead
}

describe("applyFunnelDefaultSegment", () => {
  it("sets b2b when the funnel default is b2b and payload omitted segment", () => {
    const next = applyFunnelDefaultSegment(lead(""), funnel("b2b"))
    expect(next.segment).toBe("b2b")
  })

  it("does not override segment from the payload", () => {
    const next = applyFunnelDefaultSegment(lead("b2c"), funnel("b2b"))
    expect(next.segment).toBe("b2c")
  })
})
