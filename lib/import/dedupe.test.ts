import { describe, expect, it } from "vitest"

import { contactKeys, markFileDuplicates, phoneKey } from "@/lib/import/dedupe"

describe("contactKeys", () => {
  it("normalizes email and compares phone by its last 8 digits", () => {
    expect(contactKeys("  Jane@X.dk ", "+45 12 34 56 78")).toEqual(["e:jane@x.dk", "p:12345678"])
    expect(phoneKey("12345678")).toBe(phoneKey("+4512345678"))
  })

  it("ignores empty or too short values", () => {
    expect(contactKeys("", "12")).toEqual([])
    expect(contactKeys("not an email", null)).toEqual([])
  })
})

describe("markFileDuplicates", () => {
  it("keeps the first row with a contact and marks repeats", () => {
    const mapping = { email: ["Mail"], phone: ["Tlf"] }
    const rows = [
      { rowNumber: 2, values: { Mail: "a@x.dk", Tlf: null } },
      { rowNumber: 3, values: { Mail: "A@x.dk ", Tlf: null } },
      { rowNumber: 4, values: { Mail: null, Tlf: "+45 11 22 33 44" } },
      { rowNumber: 5, values: { Mail: "other@x.dk", Tlf: "11223344" } },
      { rowNumber: 6, values: { Mail: null, Tlf: null } },
    ]
    expect(markFileDuplicates(rows, mapping).map((r) => r.fileDuplicate)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ])
  })
})
