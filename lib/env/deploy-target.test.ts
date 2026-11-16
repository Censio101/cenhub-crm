import { afterEach, describe, expect, it } from "vitest"

import { shouldBlockOutboundEmail } from "@/lib/env/deploy-target"

describe("shouldBlockOutboundEmail", () => {
  const keys = ["CRM_BLOCK_OUTBOUND_EMAIL", "CRM_APP_ENV", "VERCEL_ENV"] as const
  const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {}

  afterEach(() => {
    for (const key of keys) {
      const value = snapshot[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("blocks when CRM_BLOCK_OUTBOUND_EMAIL=1", () => {
    for (const key of keys) snapshot[key] = process.env[key]
    process.env.CRM_BLOCK_OUTBOUND_EMAIL = "1"
    delete process.env.CRM_APP_ENV
    delete process.env.VERCEL_ENV
    expect(shouldBlockOutboundEmail()).toBe(true)
  })

  it("allows when unset", () => {
    for (const key of keys) snapshot[key] = process.env[key]
    delete process.env.CRM_BLOCK_OUTBOUND_EMAIL
    delete process.env.CRM_APP_ENV
    delete process.env.VERCEL_ENV
    expect(shouldBlockOutboundEmail()).toBe(false)
  })
})