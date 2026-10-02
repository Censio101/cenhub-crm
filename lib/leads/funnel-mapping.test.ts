import { describe, expect, it } from "vitest"

import {
  isValidMappingTarget,
  isValidSourcePath,
  validateFunnelFieldMapping,
} from "@/lib/leads/funnel-mapping"

describe("isValidSourcePath", () => {
  it.each(["name", "answers.size", "a.b.c", "a b", "Your Name"])("accepts %s", (path) => {
    expect(isValidSourcePath(path)).toBe(true)
  })
  it.each(["", "a..b", ".a", "a.", " ", "x".repeat(201)])("rejects %j", (path) => {
    expect(isValidSourcePath(path)).toBe(false)
  })
})

describe("isValidMappingTarget", () => {
  it("accepts standard fields and customFields.<valid key>", () => {
    expect(isValidMappingTarget("fullName")).toBe(true)
    expect(isValidMappingTarget("externalId")).toBe(true)
    expect(isValidMappingTarget("customFields.house_size")).toBe(true)
  })
  it("rejects unknown targets and bad custom keys", () => {
    expect(isValidMappingTarget("status")).toBe(false)
    expect(isValidMappingTarget("customFields.")).toBe(false)
    expect(isValidMappingTarget("customFields.Bad Key")).toBe(false)
    expect(isValidMappingTarget("customFields.__proto__")).toBe(false)
  })
})

describe("validateFunnelFieldMapping", () => {
  it("keeps valid entries, trims paths and drops empty ones", () => {
    expect(
      validateFunnelFieldMapping({
        fullName: " contact.name ",
        email: "",
        "customFields.budget": "answers.budget",
      })
    ).toEqual({
      ok: true,
      mapping: { fullName: "contact.name", "customFields.budget": "answers.budget" },
    })
  })

  it("accepts a mapping to a column that no longer exists so it can be cleaned up", () => {
    expect(validateFunnelFieldMapping({ "customFields.gone": "x" }).ok).toBe(true)
  })

  it("explains what is wrong", () => {
    expect(validateFunnelFieldMapping(null)).toMatchObject({ ok: false })
    expect(validateFunnelFieldMapping([])).toMatchObject({ ok: false })
    expect(validateFunnelFieldMapping({ status: "x" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("status"),
    })
    expect(validateFunnelFieldMapping({ fullName: "a..b" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("a..b"),
    })
    expect(validateFunnelFieldMapping({ fullName: 5 })).toMatchObject({ ok: false })
  })
})
