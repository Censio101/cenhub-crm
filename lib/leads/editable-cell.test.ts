import { describe, expect, it } from "vitest"

import {
  editableDisplayText,
  isUnchangedEdit,
  parseEditedValue,
} from "@/lib/leads/editable-cell"

describe("editableDisplayText", () => {
  it("shows text and numbers, and nothing for empty or odd values", () => {
    expect(editableDisplayText("Olie")).toBe("Olie")
    expect(editableDisplayText(1980)).toBe("1980")
    expect(editableDisplayText(0)).toBe("0")
    expect(editableDisplayText(null)).toBe("")
    expect(editableDisplayText(undefined)).toBe("")
    expect(editableDisplayText(Number.NaN)).toBe("")
    expect(editableDisplayText({ a: 1 })).toBe("")
  })
})

describe("parseEditedValue", () => {
  it("keeps text exactly as typed", () => {
    expect(parseEditedValue("text", "  hej ")).toEqual({ ok: true, value: "  hej " })
    expect(parseEditedValue("date", "2026-11-03")).toEqual({ ok: true, value: "2026-11-03" })
  })

  it("reads numbers, with a comma as decimal sign", () => {
    expect(parseEditedValue("number", "140")).toEqual({ ok: true, value: 140 })
    expect(parseEditedValue("number", " 12,5 ")).toEqual({ ok: true, value: 12.5 })
    expect(parseEditedValue("number", "-3")).toEqual({ ok: true, value: -3 })
    expect(parseEditedValue("number", "0")).toEqual({ ok: true, value: 0 })
  })

  it("treats an empty number box as no value", () => {
    expect(parseEditedValue("number", "")).toEqual({ ok: true, value: null })
    expect(parseEditedValue("number", "   ")).toEqual({ ok: true, value: null })
  })

  it("rejects text in a number column", () => {
    expect(parseEditedValue("number", "abc")).toEqual({ ok: false })
    expect(parseEditedValue("number", "12abc")).toEqual({ ok: false })
    expect(parseEditedValue("number", "1.2.3")).toEqual({ ok: false })
  })
})

describe("isUnchangedEdit", () => {
  it("is true only when nothing would change", () => {
    expect(isUnchangedEdit("Olie", "Olie")).toBe(true)
    expect(isUnchangedEdit("Olie", "Gas")).toBe(false)
    expect(isUnchangedEdit(140, 140)).toBe(true)
    expect(isUnchangedEdit(140, 141)).toBe(false)
    expect(isUnchangedEdit(undefined, null)).toBe(true)
    expect(isUnchangedEdit(140, null)).toBe(false)
    expect(isUnchangedEdit(undefined, "")).toBe(true)
  })
})
