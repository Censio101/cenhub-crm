import { afterEach, describe, expect, it } from "vitest"

import { isCronAuthorized } from "@/lib/meta/cron-auth"

describe("isCronAuthorized", () => {
  const previous = process.env.CRON_SECRET

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  })

  it("accepts the bearer header and ignores a secret in the query string", () => {
    process.env.CRON_SECRET = "cron-secret"
    expect(
      isCronAuthorized(new Request("https://www.cenhub.dk/api/cron/meta-sync", {
        headers: { authorization: "Bearer cron-secret" },
      }))
    ).toBe(true)
    expect(
      isCronAuthorized(new Request("https://www.cenhub.dk/api/cron/meta-sync?secret=cron-secret"))
    ).toBe(false)
  })
})
