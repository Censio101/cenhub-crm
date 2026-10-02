import { describe, expect, it } from "vitest"

import {
  foldText,
  parseImportDateTime,
  parseImportNumber,
  parseImportSegment,
  parseImportServices,
  parseImportStatus,
} from "@/lib/import/parse-values"

describe("foldText", () => {
  it("spells out Danish letters and drops punctuation", () => {
    expect(foldText("Venter på kunden")).toBe("venterpaakunden")
    expect(foldText("Fødselsdato")).toBe("foedselsdato")
    expect(foldText("E-mail")).toBe("email")
  })
})

describe("parseImportDateTime", () => {
  it("reads Excel serial numbers with and without a time", () => {
    expect(parseImportDateTime(45000)).toEqual({ date: "2023-03-15", time: null })
    expect(parseImportDateTime(45000.5)).toEqual({ date: "2023-03-15", time: "12:00" })
    expect(parseImportDateTime("45000")).toEqual({ date: "2023-03-15", time: null })
  })

  it("reads text dates in the usual formats", () => {
    expect(parseImportDateTime("24-03-2026")).toEqual({ date: "2026-03-24", time: null })
    expect(parseImportDateTime("2026-03-24 14:30")).toEqual({ date: "2026-03-24", time: "14:30" })
  })

  it("returns null for nothing readable", () => {
    expect(parseImportDateTime("soon")).toBeNull()
    expect(parseImportDateTime("")).toBeNull()
    expect(parseImportDateTime(null)).toBeNull()
    expect(parseImportDateTime(12)).toBeNull()
  })
})

describe("parseImportNumber", () => {
  it.each([
    [12500, 12500],
    ["12500", 12500],
    ["12.500,50", 12500.5],
    ["12,500.50", 12500.5],
    ["kr. 12 500", 12500],
    ["12.500", 12500],
    ["12,5", 12.5],
    ["1,250", 1250],
    ["-300,25", -300.25],
    ["DKK 4.999,95", 4999.95],
  ])("reads %s", (input, expected) => {
    expect(parseImportNumber(input)).toBe(expected)
  })

  it.each(["", "abc", "12abc", null])("rejects %s", (input) => {
    expect(parseImportNumber(input)).toBeNull()
  })
})

describe("parseImportStatus", () => {
  it.each([
    ["Vundet", "won"],
    ["won", "won"],
    ["Mistet lead", "lost"],
    ["Opkald 2", "call_2"],
    ["Nyt lead, venter på opkald", "new_waiting_call"],
    ["Tilbud sendt", "proposal_sent"],
    ["Venter på kunden", "waiting_on_client"],
    ["not_qualified", "not_qualified"],
  ])("maps %s", (input, expected) => {
    expect(parseImportStatus(input)).toBe(expected)
  })

  it("returns null for text that is not a status", () => {
    expect(parseImportStatus("maybe later")).toBeNull()
    expect(parseImportStatus("")).toBeNull()
  })
})

describe("segment and services", () => {
  it("reads segment words", () => {
    expect(parseImportSegment("Erhverv")).toBe("b2b")
    expect(parseImportSegment("Privat")).toBe("b2c")
    expect(parseImportSegment("???")).toBeNull()
  })

  it("splits services and reports the unknown ones", () => {
    expect(
      parseImportServices("Tagdækning; Renovering, Mystery", [
        {
          id: "renovering",
          nameDa: "Renovering",
          nameEn: "Renovation",
          source: "manual",
          categoryNames: [],
        },
        {
          id: "tagdaekning",
          nameDa: "Tagdækning",
          nameEn: "Roofing",
          source: "manual",
          categoryNames: [],
        },
      ])
    ).toEqual({
      ids: ["tagdaekning", "renovering"],
      unknown: ["Mystery"],
    })
  })
})
