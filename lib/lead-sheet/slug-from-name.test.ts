import { describe, expect, it } from "vitest"

import { slugifyIndustryName, uniqueSlug } from "@/lib/lead-sheet/slug-from-name"

describe("slugifyIndustryName", () => {
  it("derives a stable slug from English name", () => {
    expect(slugifyIndustryName("Window Cleaning")).toBe("window-cleaning")
  })

  it("dedupes with numeric suffix", () => {
    const taken = new Set(["roofing"])
    expect(uniqueSlug("roofing", (s) => taken.has(s))).toBe("roofing-2")
  })
})
