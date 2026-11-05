import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/lib/auth/safe-next-path"

describe("safeNextPath", () => {
  it("keeps an in-app path", () => {
    expect(safeNextPath("/leads")).toBe("/leads")
    expect(safeNextPath("/auth/setup-password", "/")).toBe("/auth/setup-password")
  })

  it("rejects off-site and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.example")).toBe("/")
    expect(safeNextPath("//evil.example")).toBe("/")
    expect(safeNextPath("\\\\evil")).toBe("/")
    expect(safeNextPath(null, "/auth/setup-password")).toBe("/auth/setup-password")
  })
})
