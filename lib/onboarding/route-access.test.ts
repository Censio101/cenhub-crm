import { describe, expect, it } from "vitest"

import { isPublicApiPath, isPublicPagePath, isPublicRequest } from "@/lib/onboarding/route-access"

describe("route-access", () => {
  it("keeps login and offer flows public", () => {
    expect(isPublicPagePath("/login")).toBe(true)
    expect(isPublicPagePath("/login/glemt-kode")).toBe(true)
    expect(isPublicPagePath("/tilbud/demo")).toBe(true)
    expect(isPublicApiPath("/api/auth/login")).toBe(true)
    expect(isPublicApiPath("/api/offers/demo-slug")).toBe(true)
  })

  it("locks internal app and admin APIs", () => {
    expect(isPublicPagePath("/admin")).toBe(false)
    expect(isPublicPagePath("/kunder")).toBe(false)
    expect(isPublicApiPath("/api/admin/customers/ws-1")).toBe(false)
    expect(isPublicRequest("/admin/kunder")).toBe(false)
  })
})
