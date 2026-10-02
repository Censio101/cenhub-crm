import { describe, expect, it } from "vitest"

import {
  addResults,
  emptySummary,
  importFingerprint,
  skippedRowsCsv,
} from "@/lib/import/run-batches"
import type { ImportRowResult } from "@/lib/import/types"

const lead = {
  date: "2026-01-01",
  time: null,
  fullName: "A",
  email: "",
  phone: "",
  segment: "",
  companyName: "",
  address: "",
  zipCode: "",
  city: "",
  serviceIds: [],
  status: "new_waiting_call",
  salesPrice: null,
  profit: null,
  platform: "",
  customFields: {},
}

const results: ImportRowResult[] = [
  { rowNumber: 2, outcome: "import", warnings: [], changes: [], lead },
  { rowNumber: 3, outcome: "import", warnings: [{ field: "date", message: "bad" }], changes: [] },
  { rowNumber: 4, outcome: "skip", reason: "no_contact", warnings: [], changes: [] },
  { rowNumber: 5, outcome: "skip", reason: "duplicate_file", warnings: [], changes: [] },
]

describe("addResults", () => {
  it("counts outcomes, collects issues and keeps the first previews", () => {
    const summary = addResults(emptySummary(), results, 2)
    expect(summary).toMatchObject({
      total: 4,
      toImport: 2,
      withWarnings: 1,
      inserted: 2,
      skipped: { no_contact: 1, duplicate_file: 1, duplicate_existing: 0 },
    })
    expect(summary.previews.map((p) => p.rowNumber)).toEqual([2])
    expect(summary.issues.map((i) => [i.rowNumber, i.kind])).toEqual([
      [3, "warning"],
      [4, "skipped"],
      [5, "skipped"],
    ])
    expect(summary.skippedRows).toHaveLength(2)
  })

  it("adds up over several batches", () => {
    const once = addResults(emptySummary(), results)
    const twice = addResults(once, results)
    expect(twice.total).toBe(8)
    expect(twice.toImport).toBe(4)
  })
})

describe("skippedRowsCsv", () => {
  it("lists the sheet row, the reason and the original cells", () => {
    const csv = skippedRowsCsv(
      ["Navn", "Mail"],
      [
        { rowNumber: 4, values: { Navn: null, Mail: "" } },
        { rowNumber: 5, values: { Navn: "Ole", Mail: "o@x.dk" } },
      ],
      [{ rowNumber: 5, reason: "duplicate_file" }],
      (reason) => `reason:${reason}`
    )
    expect(csv.split("\r\n")).toEqual([
      "Row,Reason,Navn,Mail",
      "5,reason:duplicate_file,Ole,o@x.dk",
    ])
  })
})

describe("importFingerprint", () => {
  const base = {
    fileName: "a.xlsx",
    size: 10,
    sheet: "S",
    headerRow: 1,
    rowCount: 3,
    mapping: { email: ["Mail"], fullName: ["Navn"] },
    options: {
      defaultStatus: "new_waiting_call" as const,
      defaultPlatform: "" as const,
      skipDuplicates: true,
    },
  }

  it("ignores the order of the mapping but notices any real change", () => {
    const reordered = { ...base, mapping: { fullName: ["Navn"], email: ["Mail"] } }
    expect(importFingerprint(reordered)).toBe(importFingerprint(base))
    expect(importFingerprint({ ...base, headerRow: 2 })).not.toBe(importFingerprint(base))
    expect(
      importFingerprint({ ...base, options: { ...base.options, skipDuplicates: false } })
    ).not.toBe(importFingerprint(base))
  })
})
