import { describe, expect, it } from "vitest"

import { toCsv } from "@/lib/leads/export-csv"

describe("toCsv", () => {
  it("uses a BOM, semicolons and Windows line breaks", () => {
    expect(toCsv(["Name", "City"], [["Anna", "Aarhus"]])).toBe("\uFEFFName;City\r\nAnna;Aarhus")
  })

  it("quotes cells that contain a semicolon, quote or line break", () => {
    expect(toCsv(["Note"], [['Say "hi"; then\nstop']])).toBe(
      '\uFEFFNote\r\n"Say ""hi""; then\nstop"'
    )
  })

  it("writes an empty body when there are no rows", () => {
    expect(toCsv(["Name"], [])).toBe("\uFEFFName")
  })
})
