import { describe, expect, it } from "vitest"

import { buildLeadPatch, isEmptyLeadPatch } from "@/lib/lead-sheet/lead-patch-diff"
import { emptyLead, type Lead } from "@/lib/leads"

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    ...emptyLead("lead-1"),
    fullName: "Anna Jensen",
    email: "anna@example.com",
    phone: "12345678",
    date: "2026-10-07",
    ...overrides,
  }
}

describe("buildLeadPatch", () => {
  it("is empty when nothing changed", () => {
    expect(isEmptyLeadPatch(buildLeadPatch(lead(), lead()))).toBe(true)
  })

  it("only contains the changed fields", () => {
    const patch = buildLeadPatch(lead(), lead({ fullName: "Anna J.", salesPrice: 90000 }))
    expect(patch).toEqual({ fullName: "Anna J.", salesPrice: 90000 })
  })

  it("detects service list changes", () => {
    const patch = buildLeadPatch(lead({ serviceIds: ["a"] }), lead({ serviceIds: ["a", "b"] }))
    expect(patch).toEqual({ serviceIds: ["a", "b"] })
  })

  it("clears a time and a price when emptied", () => {
    const patch = buildLeadPatch(
      lead({ time: "09:30", salesPrice: 5000 }),
      lead({ time: null, salesPrice: null })
    )
    expect(patch).toEqual({ time: null, salesPrice: null })
  })

  it("sends only changed custom fields and nulls the removed ones", () => {
    const patch = buildLeadPatch(
      lead({ customFields: { note: "old", kwh: 4000, photo: { text: "A", url: "https://a.dk" } } }),
      lead({ customFields: { note: "new", kwh: 4000 } })
    )
    expect(patch).toEqual({ customFields: { note: "new", photo: null } })
  })

  it("ignores object key order (the database stores {url, text})", () => {
    const patch = buildLeadPatch(
      lead({ customFields: { photo: { url: "https://example.com/a.jpg", text: "Roof" } } }),
      lead({ customFields: { photo: { text: "Roof", url: "https://example.com/a.jpg" } } })
    )
    expect(isEmptyLeadPatch(patch)).toBe(true)
  })

  it("treats an unchanged image link as untouched", () => {
    const photo = { text: "Roof", url: "https://example.com/a.jpg" }
    const patch = buildLeadPatch(
      lead({ customFields: { photo } }),
      lead({ customFields: { photo: { ...photo } } })
    )
    expect(isEmptyLeadPatch(patch)).toBe(true)
  })
})
