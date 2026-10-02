import { describe, expect, it } from "vitest"

import { parseHvidbjergPartner } from "@/lib/account-settings"

describe("hvidbjerg partner certification", () => {
  it("defaults to on when the stored value is missing", () => {
    expect(parseHvidbjergPartner(undefined)).toBe(true)
    expect(parseHvidbjergPartner(null)).toBe(true)
  })

  it("keeps an explicit off value", () => {
    expect(parseHvidbjergPartner(false)).toBe(false)
  })
})
