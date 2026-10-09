import { describe, expect, it } from "vitest"

import { findLeadByEmail, findLeadByPhone, phoneMatchKey } from "@/lib/leads/duplicates"
import { emptyLead, type Lead } from "@/lib/leads"

function lead(id: string, patch: Partial<Lead>): Lead {
  return { ...emptyLead(id), ...patch }
}

describe("phoneMatchKey", () => {
  it("ignores spacing and the +45 prefix", () => {
    expect(phoneMatchKey("+45 12 34 56 78")).toBe("12345678")
    expect(phoneMatchKey("12345678")).toBe("12345678")
    expect(phoneMatchKey("0045 12345678")).toBe("12345678")
  })

  it("returns null for numbers that are too short to compare", () => {
    expect(phoneMatchKey("")).toBeNull()
    expect(phoneMatchKey("123")).toBeNull()
  })
})

describe("findLeadByPhone", () => {
  const leads = [
    lead("a", { fullName: "Anna", phone: "+45 12 34 56 78" }),
    lead("b", { fullName: "Bo", phone: "87654321" }),
  ]

  it("finds a lead with the same number written differently", () => {
    expect(findLeadByPhone(leads, "12345678")?.id).toBe("a")
  })

  it("ignores the lead being edited", () => {
    expect(findLeadByPhone(leads, "12345678", "a")).toBeNull()
  })

  it("returns null when nothing matches or the input is incomplete", () => {
    expect(findLeadByPhone(leads, "11111111")).toBeNull()
    expect(findLeadByPhone(leads, "123")).toBeNull()
  })
})

describe("findLeadByEmail", () => {
  const leads = [lead("a", { email: "Anna@Example.com" })]

  it("matches regardless of case and surrounding spaces", () => {
    expect(findLeadByEmail(leads, "  anna@example.com ")?.id).toBe("a")
  })

  it("ignores the lead being edited and incomplete input", () => {
    expect(findLeadByEmail(leads, "anna@example.com", "a")).toBeNull()
    expect(findLeadByEmail(leads, "anna")).toBeNull()
  })
})
