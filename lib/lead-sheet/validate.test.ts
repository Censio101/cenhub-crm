import { describe, expect, it } from "vitest"

import { mergeCustomFields } from "@/lib/lead-sheet/apply-custom-fields-patch"
import {
  assertAllBuiltinsPresent,
  sanitizeCustomFieldsPatch,
  validateCustomFieldValue,
} from "@/lib/lead-sheet/validate"
import { BUILTIN_COLUMN_KEYS, type LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"

describe("assertAllBuiltinsPresent", () => {
  it("accepts full builtin set", () => {
    expect(assertAllBuiltinsPresent(BUILTIN_COLUMN_KEYS)).toBeNull()
  })

  it("rejects missing builtin", () => {
    expect(assertAllBuiltinsPresent(BUILTIN_COLUMN_KEYS.slice(0, 5))).toMatch(/Missing/)
  })
})

describe("validateCustomFieldValue", () => {
  const photo = {
    fieldKey: "photo",
    fieldType: "image" as const,
    config: {},
    required: false,
  }

  it("validates legacy image path", () => {
    expect(validateCustomFieldValue(photo, "org/lead/photo/x.jpg")).toBeNull()
  })

  it("validates image link value", () => {
    expect(
      validateCustomFieldValue(photo, { text: "Image 1", url: "https://example.com/a.jpg" })
    ).toBeNull()
  })

  it("rejects unsafe image link", () => {
    expect(
      validateCustomFieldValue(photo, { text: "Image 1", url: "javascript:alert(1)" })
    ).toMatch(/URL/)
  })

  it("treats an image link without URL as empty", () => {
    expect(validateCustomFieldValue(photo, { text: "", url: "" })).toBeNull()
    expect(validateCustomFieldValue({ ...photo, required: true }, { text: "", url: "" })).toMatch(
      /required/
    )
  })
})

describe("sanitizeCustomFieldsPatch", () => {
  const defs: LeadSheetCustomFieldDef[] = [
    { id: "1", fieldKey: "notes", label: "Notes", fieldType: "text", required: false, config: {} },
    { id: "2", fieldKey: "photo", label: "Photo", fieldType: "image", required: false, config: {} },
  ]

  it("canonicalizes image links", () => {
    const { values, cleared, error } = sanitizeCustomFieldsPatch(
      { photo: { text: " Image 1 ", url: "example.com/a" } },
      defs
    )
    expect(error).toBeNull()
    expect(cleared).toEqual([])
    expect(values.photo).toEqual({ text: "Image 1", url: "https://example.com/a" })
  })

  it("reports emptied values as cleared", () => {
    const { values, cleared, error } = sanitizeCustomFieldsPatch(
      { notes: "", photo: { text: "", url: "" } },
      defs
    )
    expect(error).toBeNull()
    expect(values).toEqual({})
    expect(cleared.sort()).toEqual(["notes", "photo"])
  })

  it("ignores keys without a definition", () => {
    const { values, cleared } = sanitizeCustomFieldsPatch({ unknown: "x" }, defs)
    expect(values).toEqual({})
    expect(cleared).toEqual([])
  })

  it("returns an error for an invalid link", () => {
    const { error } = sanitizeCustomFieldsPatch(
      { photo: { text: "x", url: "javascript:alert(1)" } },
      defs
    )
    expect(error).toMatch(/URL/)
  })
})

describe("mergeCustomFields", () => {
  it("removes cleared keys and keeps the rest", () => {
    expect(mergeCustomFields({ a: "1", b: "2", c: "3" }, { a: "new" }, ["b"])).toEqual({
      a: "new",
      c: "3",
    })
  })
})
