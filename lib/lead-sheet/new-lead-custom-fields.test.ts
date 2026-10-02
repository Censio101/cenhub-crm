import { describe, expect, it } from "vitest"

import { sanitizeNewLeadCustomFields } from "@/lib/lead-sheet/apply-custom-fields-patch"
import type { CustomFieldType, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

function sheet(
  fields: Array<{
    key: string
    type: CustomFieldType
    required?: boolean
    options?: string[]
    label?: string
  }>
): ResolvedLeadSheetConfig {
  return {
    template: {
      id: "t",
      name: "t",
      description: "",
      isSystemDefault: false,
      isShared: true,
      organizationId: null,
      sourceTemplateId: null,
      subcategoryIds: [],
      categoryIds: [],
    },
    columns: fields.map((f, index) => ({
      id: `c${index}`,
      sortIndex: index,
      kind: "custom" as const,
      customField: {
        id: `f${index}`,
        fieldKey: f.key,
        label: f.label ?? f.key,
        fieldType: f.type,
        required: f.required ?? false,
        config: f.options ? { options: f.options } : {},
      },
    })),
  }
}

describe("sanitizeNewLeadCustomFields", () => {
  it("passes through when the sheet has no custom columns", () => {
    expect(sanitizeNewLeadCustomFields({ a: 1 }, sheet([]))).toEqual({
      customFields: { a: 1 },
      error: null,
    })
    expect(sanitizeNewLeadCustomFields(undefined, null)).toEqual({ customFields: {}, error: null })
  })

  it("keeps valid values, canonicalizes images and drops unknown keys", () => {
    const result = sanitizeNewLeadCustomFields(
      {
        note: "hi",
        photo: { text: " Image 1 ", url: "example.com/a.jpg" },
        stale: "old",
      },
      sheet([
        { key: "note", type: "text" },
        { key: "photo", type: "image" },
      ])
    )
    expect(result.error).toBeNull()
    expect(result.customFields).toEqual({
      note: "hi",
      photo: { text: "Image 1", url: "https://example.com/a.jpg" },
    })
  })

  it("rejects an option that is not on the column", () => {
    const result = sanitizeNewLeadCustomFields(
      { roof: "Thatch" },
      sheet([{ key: "roof", type: "select", options: ["Tile", "Metal"] }])
    )
    expect(result.error).toBe("Invalid option")
  })

  it("requires required columns to be filled", () => {
    const required = sheet([{ key: "budget", type: "number", required: true, label: "Budget" }])
    expect(sanitizeNewLeadCustomFields({}, required).error).toBe("Budget is required")
    expect(sanitizeNewLeadCustomFields({ budget: null }, required).error).toBe("budget is required")
    expect(sanitizeNewLeadCustomFields({ budget: 10 }, required)).toEqual({
      customFields: { budget: 10 },
      error: null,
    })
  })

  it("does not require optional columns", () => {
    expect(sanitizeNewLeadCustomFields({}, sheet([{ key: "note", type: "text" }]))).toEqual({
      customFields: {},
      error: null,
    })
  })
})
