import { afterEach, describe, expect, it } from "vitest"

import { clearClientCaches, setCustomersCache, setLeadsCache } from "@/lib/data/client-cache"

import {
  shouldAnimateBoardEnter,
  shouldFadeClientCoreSwitch,
} from "@/lib/layout/client-navigation-enter"
import { shouldSettleClientCoreNavigation } from "@/lib/layout/client-navigation-ack"
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

  it("leaves the fade to the page shell when entering core from admin", () => {
    expect(
      shouldAnimateBoardEnter({
        pathname: "/",
        previousZone: "admin",
        workspaceWarm: true,
        hasLeadsCache: true,
        hasCustomersCache: true,
      })
    ).toBe(false)
  })

  it("fades only between dashboard, leads, and kunder", () => {
    expect(shouldFadeClientCoreSwitch("/", "/leads")).toBe(true)
    expect(shouldFadeClientCoreSwitch("/leads", "/kunder")).toBe(true)
    expect(shouldFadeClientCoreSwitch("/leads", "/virksomhed")).toBe(false)
    expect(shouldFadeClientCoreSwitch(null, "/leads")).toBe(false)
  })

  it("does not stack board fade on cold load (route enter handles motion)", () => {
    expect(
      shouldAnimateBoardEnter({
        pathname: "/kunder",
        previousZone: null,
        workspaceWarm: false,
        hasLeadsCache: false,
        hasCustomersCache: false,
      })
    ).toBe(false)
  })
})

describe("client core navigation settle", () => {
  afterEach(() => {
    clearClientCaches()
  })

  it("skips motion when the target tab is already cached (instant switch)", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    expect(shouldSettleClientCoreNavigation("/", "/leads", false, "acme")).toBe(false)
    expect(shouldSettleClientCoreNavigation("/leads", "/", false, "acme")).toBe(false)
  })

  it("settle only on cold kunder until customers cache exists", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    expect(shouldSettleClientCoreNavigation("/leads", "/kunder", false, "acme")).toBe(true)
    setCustomersCache({
      customers: [],
      source: "supabase",
      organizationName: "Acme",
      organizationSlug: "acme",
    })
    expect(shouldSettleClientCoreNavigation("/leads", "/kunder", false, "acme")).toBe(false)
  })
})
