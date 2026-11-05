import { createHmac } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"

import { verifyMetaWebhookSignature } from "@/lib/meta/verify-webhook-signature"

describe("verifyMetaWebhookSignature", () => {
  const previous = process.env.META_APP_SECRET

  afterEach(() => {
    if (previous === undefined) delete process.env.META_APP_SECRET
    else process.env.META_APP_SECRET = previous
  })

  it("rejects a body when the app secret is not set", () => {
    delete process.env.META_APP_SECRET
    expect(verifyMetaWebhookSignature("{}", "sha256=ab")).toBe(false)
    expect(verifyMetaWebhookSignature("{}", null)).toBe(false)
  })

  it("accepts a matching signature", () => {
    process.env.META_APP_SECRET = "test-secret"
    const body = "{\"leadgen_id\":\"1\"}"
    const digest = createHmac("sha256", "test-secret").update(body, "utf8").digest("hex")
    expect(verifyMetaWebhookSignature(body, `sha256=${digest}`)).toBe(true)
    expect(verifyMetaWebhookSignature(body, "sha256=00")).toBe(false)
  })
})
