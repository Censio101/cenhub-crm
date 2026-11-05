import { describe, expect, it } from "vitest"

import { evaluateAuthRateLimit } from "@/lib/auth/auth-request-rate-limit"

describe("evaluateAuthRateLimit", () => {
  const now = Date.parse("2026-11-05T12:00:00Z")

  it("allows a quiet caller", () => {
    expect(
      evaluateAuthRateLimit({
        now,
        ipCount: 0,
        oldestIpAt: null,
        globalCount: 0,
        oldestGlobalAt: null,
      }).allowed
    ).toBe(true)
  })

  it("blocks an address that already used its window", () => {
    const decision = evaluateAuthRateLimit({
      now,
      ipCount: 10,
      oldestIpAt: now - 60_000,
      globalCount: 1,
      oldestGlobalAt: now,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterSeconds).toBeGreaterThan(0)
  })
})
