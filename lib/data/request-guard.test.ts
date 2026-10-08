import { describe, expect, it } from "vitest"

import { createRequestGuard } from "@/lib/data/request-guard"

describe("createRequestGuard", () => {
  it("treats a lone request as current", () => {
    const guard = createRequestGuard()
    expect(guard.begin()()).toBe(true)
  })

  it("invalidates older requests when a newer one starts", () => {
    const guard = createRequestGuard()
    const first = guard.begin()
    const second = guard.begin()
    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })

  it("invalidates every outstanding request on dispose", () => {
    const guard = createRequestGuard()
    const first = guard.begin()
    guard.dispose()
    expect(first()).toBe(false)
    expect(guard.begin()()).toBe(true)
  })
})
