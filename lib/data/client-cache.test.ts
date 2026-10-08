import { afterEach, describe, expect, it } from "vitest"

import {
  clearClientCaches,
  getAdSpendCache,
  getCustomersCache,
  getLeadsCache,
  hasLeadsCache,
  replaceCachedLeads,
  setAdSpendCache,
  setCustomersCache,
  setLeadsCache,
} from "@/lib/data/client-cache"

afterEach(() => clearClientCaches())

describe("client cache slug matching", () => {
  it("returns the entry for the same client", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    expect(getLeadsCache("acme")).not.toBeNull()
    expect(hasLeadsCache("acme")).toBe(true)
  })

  it("misses when the cached client differs from the active one", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    expect(getLeadsCache("other")).toBeNull()
    expect(hasLeadsCache("other")).toBe(false)
  })

  it("still serves entries when either side has no slug yet", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    expect(getLeadsCache(null)).not.toBeNull()
    setLeadsCache({ leads: [], source: "supabase" })
    expect(getLeadsCache("acme")).not.toBeNull()
  })

  it("applies the same rule to customers and ad spend", () => {
    setCustomersCache({
      customers: [],
      source: "supabase",
      organizationName: "Acme",
      organizationSlug: "acme",
    })
    setAdSpendCache({ "2026-01": 10 }, "acme")

    expect(getCustomersCache("acme")).not.toBeNull()
    expect(getCustomersCache("other")).toBeNull()
    expect(getAdSpendCache("acme")).toEqual({ "2026-01": 10 })
    expect(getAdSpendCache("other")).toBeNull()
  })

  it("drops mock-source entries", () => {
    setLeadsCache({ leads: [], source: "mock", organizationSlug: "acme" })
    expect(getLeadsCache("acme")).toBeNull()
  })

  it("keeps the client slug when leads are edited locally", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    replaceCachedLeads([], "supabase")
    expect(getLeadsCache("acme")).not.toBeNull()
    expect(getLeadsCache("other")).toBeNull()
  })

  it("clears everything on client switch", () => {
    setLeadsCache({ leads: [], source: "supabase", organizationSlug: "acme" })
    setAdSpendCache({}, "acme")
    clearClientCaches()
    expect(getLeadsCache()).toBeNull()
    expect(getAdSpendCache()).toBeNull()
  })
})
