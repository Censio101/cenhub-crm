import { describe, expect, it } from "vitest"

import { shouldAnimateBoardEnter } from "@/lib/layout/client-navigation-enter"
import { getNavigationZone, isClientCorePath } from "@/lib/layout/client-navigation-zones"

describe("getNavigationZone", () => {
  it("classifies client core paths", () => {
    expect(getNavigationZone("/")).toBe("clientCore")
    expect(getNavigationZone("/leads")).toBe("clientCore")
    expect(getNavigationZone("/kunder")).toBe("clientCore")
  })

  it("classifies settings and admin", () => {
    expect(getNavigationZone("/virksomhed")).toBe("clientSettings")
    expect(getNavigationZone("/konto")).toBe("clientSettings")
    expect(getNavigationZone("/admin/overview")).toBe("admin")
  })

  it("isClientCorePath", () => {
    expect(isClientCorePath("/leads")).toBe(true)
    expect(isClientCorePath("/virksomhed")).toBe(false)
  })
})

describe("shouldAnimateBoardEnter", () => {
  it("skips fade when warm within client core", () => {
    expect(
      shouldAnimateBoardEnter({
        pathname: "/leads",
        previousZone: "clientCore",
        workspaceWarm: true,
        hasLeadsCache: true,
        hasCustomersCache: false,
      })
    ).toBe(false)
  })

  it("animates when entering core from admin", () => {
    expect(
      shouldAnimateBoardEnter({
        pathname: "/",
        previousZone: "admin",
        workspaceWarm: true,
        hasLeadsCache: true,
        hasCustomersCache: true,
      })
    ).toBe(true)
  })

  it("animates on cold core load", () => {
    expect(
      shouldAnimateBoardEnter({
        pathname: "/kunder",
        previousZone: null,
        workspaceWarm: false,
        hasLeadsCache: false,
        hasCustomersCache: false,
      })
    ).toBe(true)
  })
})
