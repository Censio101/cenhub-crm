import { describe, expect, it } from "vitest"

import { ONBOARDING_RATE_LIMITS, evaluateOnboardingRateLimit } from "./rate-limit"

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0)
const HOUR = ONBOARDING_RATE_LIMITS.windowMs

describe("evaluateOnboardingRateLimit", () => {
  it("allows a normal applicant", () => {
    expect(
      evaluateOnboardingRateLimit({
        now: NOW,
        ipCount: 0,
        oldestIpAt: null,
        globalCount: 5,
        oldestGlobalAt: NOW - 1000,
      })
    ).toEqual({ allowed: true, retryAfterSeconds: 0 })
  })

  it("blocks an IP that already sent the maximum and says when to retry", () => {
    const decision = evaluateOnboardingRateLimit({
      now: NOW,
      ipCount: ONBOARDING_RATE_LIMITS.perIp,
      oldestIpAt: NOW - 20 * 60 * 1000,
      globalCount: 3,
      oldestGlobalAt: NOW - 20 * 60 * 1000,
    })
    expect(decision.allowed).toBe(false)
    // 20 minutes into the window, so 40 minutes remain.
    expect(decision.retryAfterSeconds).toBe(40 * 60)
  })

  it("blocks everyone when the global ceiling is reached, even a brand new IP", () => {
    const decision = evaluateOnboardingRateLimit({
      now: NOW,
      ipCount: 0,
      oldestIpAt: null,
      globalCount: ONBOARDING_RATE_LIMITS.global,
      oldestGlobalAt: NOW - HOUR + 5000,
    })
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: 5 })
  })

  it("never asks to retry in less than a second", () => {
    const decision = evaluateOnboardingRateLimit({
      now: NOW,
      ipCount: ONBOARDING_RATE_LIMITS.perIp,
      oldestIpAt: NOW - HOUR,
      globalCount: 0,
      oldestGlobalAt: null,
    })
    expect(decision.retryAfterSeconds).toBe(1)
  })
})
