import { describe, expect, it } from "vitest"

import { timingSafeEqualString } from "./timing-safe-equal"

describe("timingSafeEqualString", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqualString("secret", "secret")).toBe(true)
  })

  it("returns false for different strings of same length", () => {
    expect(timingSafeEqualString("secret-a", "secret-b")).toBe(false)
  })

  it("returns false when lengths differ", () => {
    expect(timingSafeEqualString("short", "longer")).toBe(false)
  })
})
