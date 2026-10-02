import { describe, expect, it } from "vitest"

import { coerceWebhookCustomFields } from "@/lib/lead-sheet/webhook-custom-fields"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"

function def(
  fieldKey: string,
  fieldType: LeadSheetCustomFieldDef["fieldType"],
  extra: Partial<LeadSheetCustomFieldDef> = {}
): LeadSheetCustomFieldDef {
  return {
    id: fieldKey,
    fieldKey,
    label: fieldKey,
    fieldType,
    required: false,
    config: {},
    ...extra,
  }
}

const defs = [
  def("note", "text"),
  def("budget", "number"),
  def("visit_day", "date"),
  def("visit_time", "time"),
  def("roof", "select", { config: { options: ["Tile", "Metal"] } }),
  def("photo", "image"),
]

describe("coerceWebhookCustomFields", () => {
  it("accepts well-formed values for every type", () => {
    const { values, warnings } = coerceWebhookCustomFields(
      {
        note: "Call after 5",
        budget: 5000,
        visit_day: "2026-03-24",
        visit_time: "14:30",
        roof: "Tile",
        photo: { text: "Image 1", url: "https://example.com/a.jpg" },
      },
      defs
    )
    expect(warnings).toEqual([])
    expect(values).toEqual({
      note: "Call after 5",
      budget: 5000,
      visit_day: "2026-03-24",
      visit_time: "14:30",
      roof: "Tile",
      photo: { text: "Image 1", url: "https://example.com/a.jpg" },
    })
  })

  it("coerces forgiving sender formats", () => {
    const { values, warnings } = coerceWebhookCustomFields(
      {
        budget: "5 000,50",
        visit_day: "2026-03-24T10:15:00Z",
        visit_time: "9:05:00",
        roof: " metal ",
        photo: "example.com/b.jpg",
        note: 42,
      },
      defs
    )
    expect(warnings).toEqual([])
    expect(values).toMatchObject({
      budget: 5000.5,
      visit_day: "2026-03-24",
      visit_time: "09:05",
      roof: "Metal",
      photo: { text: "", url: "https://example.com/b.jpg" },
      note: "42",
    })
  })

  it("skips invalid values with a warning instead of failing", () => {
    const { values, warnings } = coerceWebhookCustomFields(
      {
        note: "ok",
        budget: "lots",
        visit_day: "someday",
        visit_time: "25:00",
        roof: "Thatch",
        photo: "javascript:alert(1)",
      },
      defs
    )
    expect(values).toEqual({ note: "ok" })
    expect(warnings.map((w) => [w.field, w.code])).toEqual([
      ["budget", "invalid_value"],
      ["visit_day", "invalid_value"],
      ["visit_time", "invalid_value"],
      ["roof", "invalid_value"],
      ["photo", "invalid_value"],
    ])
  })

  it("warns about unknown keys and ignores empty values", () => {
    const { values, warnings } = coerceWebhookCustomFields(
      { mystery: "x", note: "", budget: null },
      defs
    )
    expect(values).toEqual({})
    expect(warnings).toEqual([expect.objectContaining({ field: "mystery", code: "unknown_field" })])
  })

  it("reports required fields that are missing", () => {
    const { warnings } = coerceWebhookCustomFields({}, [def("must", "text", { required: true })])
    expect(warnings).toEqual([expect.objectContaining({ field: "must", code: "missing_required" })])
  })

  it("flags a non-object container and still returns no values", () => {
    const { values, warnings } = coerceWebhookCustomFields("nope", defs)
    expect(values).toEqual({})
    expect(warnings).toEqual([expect.objectContaining({ code: "invalid_container" })])
  })

  it("treats a missing container as nothing to do", () => {
    expect(coerceWebhookCustomFields(undefined, defs)).toEqual({ values: {}, warnings: [] })
  })
})
