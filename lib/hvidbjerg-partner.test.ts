import { describe, expect, it } from "vitest"

import { parseHvidbjergPartner } from "@/lib/hvidbjerg-partner"

describe("hvidbjerg partner certification", () => {
  it("defaults to off when the stored value is missing", () => {
    expect(parseHvidbjergPartner(undefined)).toBe(false)
    expect(parseHvidbjergPartner(null)).toBe(false)
  })

  it("preserves explicit boolean values", () => {
    expect(parseHvidbjergPartner(true)).toBe(true)
    expect(parseHvidbjergPartner(false)).toBe(false)
  })
})
