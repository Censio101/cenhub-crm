import { describe, expect, it } from "vitest"

import { scanSampleServiceValues } from "@/lib/funnels/sample-service-values"

describe("scanSampleServiceValues", () => {
  it("reads strings and arrays from a mapped path", () => {
    const sample = {
      payload: { services: ["Tag arbejde", "Renovering"] },
    }
    expect(scanSampleServiceValues(sample, "payload.services")).toEqual([
      "Renovering",
      "Tag arbejde",
    ])
  })
})
