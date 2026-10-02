import { describe, expect, it } from "vitest"

import { parseCsvText } from "@/lib/import/parse-file"
import { headersFromRow, sheetTable } from "@/lib/import/sheet-table"

describe("headersFromRow", () => {
  it("names blank headers and numbers repeated ones", () => {
    expect(headersFromRow(["Navn", "", "Navn", " Mail "])).toEqual([
      "Navn",
      "Column 2",
      "Navn (2)",
      "Mail",
    ])
  })
})

describe("sheetTable", () => {
  const matrix = [
    ["Kunder 2024", null, null],
    ["Navn", "Mail", "Pris"],
    ["Jane", "j@x.dk", 100],
    [null, null, null],
    ["Ole", "", null],
  ]

  it("uses the chosen header row and skips empty rows", () => {
    const { headers, rows } = sheetTable(matrix, 2)
    expect(headers).toEqual(["Navn", "Mail", "Pris"])
    expect(rows).toEqual([
      { rowNumber: 3, values: { Navn: "Jane", Mail: "j@x.dk", Pris: 100 } },
      { rowNumber: 5, values: { Navn: "Ole", Mail: null, Pris: null } },
    ])
  })

  it("returns nothing when the header row does not exist", () => {
    expect(sheetTable(matrix, 9)).toEqual({ headers: [], rows: [] })
  })
})

describe("parseCsvText", () => {
  it("detects the semicolon separator and keeps Danish text", () => {
    const rows = parseCsvText("\uFEFFNavn;By;Pris\nJæger;Århus;12.500,50\n")
    expect(rows).toEqual([
      ["Navn", "By", "Pris"],
      ["Jæger", "Århus", "12.500,50"],
    ])
  })

  it("handles commas, quotes and blank cells", () => {
    expect(parseCsvText('a,b\n"x, y",\n')).toEqual([
      ["a", "b"],
      ["x, y", null],
    ])
  })
})
