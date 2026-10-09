import { describe, expect, it } from "vitest"

import { isLeadFieldEditableInCrm } from "@/lib/leads/field-editability"
import { emptyLead, type Lead } from "@/lib/leads"

function lead(patch: Partial<Lead>): Lead {
  return { ...emptyLead("t1"), ...patch }
}

describe("isLeadFieldEditableInCrm", () => {
  it("allows company on private leads when a company name is present", () => {
    const row = lead({ segment: "b2c", companyName: "Johnson Controls" })
    expect(isLeadFieldEditableInCrm(row, "companyName")).toBe(true)
  })

  it("blocks empty company on private leads", () => {
    const row = lead({ segment: "b2c", companyName: "" })
    expect(isLeadFieldEditableInCrm(row, "companyName")).toBe(false)
  })

  it("allows empty company on business leads", () => {
    const row = lead({ segment: "b2b", companyName: "" })
    expect(isLeadFieldEditableInCrm(row, "companyName")).toBe(true)
  })

  it("allows editing filled Meta-ingested contact fields", () => {
    const row = lead({
      source: "meta",
      fullName: "Anna",
      email: "",
    })
    expect(isLeadFieldEditableInCrm(row, "fullName")).toBe(true)
    expect(isLeadFieldEditableInCrm(row, "email")).toBe(false)
  })
})
