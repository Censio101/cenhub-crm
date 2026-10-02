import { describe, expect, it } from "vitest"

import {
  applyMetaFieldMapping,
  metaCustomTarget,
  validateMetaFieldMappingForEnable,
} from "@/lib/meta/meta-field-mapping"

describe("applyMetaFieldMapping", () => {
  it("maps standard Meta keys and stores custom fields in metaExtra", () => {
    const result = applyMetaFieldMapping(
      [
        { name: "full_name", values: ["Jane Doe"] },
        { name: "email", values: ["jane@example.com"] },
        { name: "phone", values: ["+4512345678"] },
        { name: "custom_question", values: ["yes"] },
      ],
      { fullName: "full_name", email: "email", phone: "phone" },
      "ad-123"
    )

    expect(result.fullName).toBe("Jane Doe")
    expect(result.email).toBe("jane@example.com")
    expect(result.metaAdId).toBe("ad-123")
    expect(result.metaExtra.custom_question).toBe("yes")
  })

  it("does not alias-guess when explicit mapping is saved", () => {
    const result = applyMetaFieldMapping(
      [
        { name: "full_name", values: ["Jane Doe"] },
        { name: "email", values: ["jane@example.com"] },
      ],
      { fullName: "full_name" },
      "ad-123"
    )

    expect(result.fullName).toBe("Jane Doe")
    expect(result.email).toBe("")
    expect(result.metaExtra.email).toBe("jane@example.com")
  })
})

describe("validateMetaFieldMappingForEnable", () => {
  it("requires name and email or phone", () => {
    expect(validateMetaFieldMappingForEnable({ fullName: "full_name" }).ok).toBe(false)
    expect(
      validateMetaFieldMappingForEnable({ fullName: "full_name", email: "email" }).ok
    ).toBe(true)
    expect(
      validateMetaFieldMappingForEnable({ fullName: "full_name", phone: "phone" }).ok
    ).toBe(true)
  })
})

describe("custom column targets", () => {
  it("collects custom:<key> answers separately from Meta extras", () => {
    const result = applyMetaFieldMapping(
      [
        { name: "full_name", values: ["Jane Doe"] },
        { name: "budget_question", values: ["5000"] },
        { name: "other", values: ["x"] },
      ],
      { fullName: "full_name", [metaCustomTarget("budget")]: "budget_question" }
    )
    expect(result.customRaw).toEqual({ budget: "5000" })
    expect(result.metaExtra).toEqual({ other: "x" })
    expect(result.metaExtra.budget_question).toBeUndefined()
  })

  it("skips custom targets whose question has no answer", () => {
    const result = applyMetaFieldMapping(
      [{ name: "full_name", values: ["Jane"] }],
      { fullName: "full_name", [metaCustomTarget("budget")]: "budget_question" }
    )
    expect(result.customRaw).toEqual({})
  })
})
