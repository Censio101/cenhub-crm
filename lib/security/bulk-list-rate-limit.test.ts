import { describe, expect, it } from "vitest"

import {
  BULK_LIST_RATE_LIMITS,
  evaluateBulkListRateLimit,
} from "@/lib/security/bulk-list-rate-limit"

describe("evaluateBulkListRateLimit", () => {
  const now = 1_700_000_000_000

  it("allows when under cap", () => {
    expect(
      evaluateBulkListRateLimit({
        now,
        count: BULK_LIST_RATE_LIMITS.perUserOrgRoute - 1,
        oldestAt: now - 10_000,
      })
    ).toEqual({ allowed: true, retryAfterSeconds: 0 })
  })

  it("blocks when at cap", () => {
    const oldestAt = now - 30_000
    const decision = evaluateBulkListRateLimit({
      now,
      count: BULK_LIST_RATE_LIMITS.perUserOrgRoute,
      oldestAt,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterSeconds).toBeGreaterThan(0)
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(31)
  })
})