import { describe, expect, it } from "vitest"

import {
  defaultDisplayMode,
  parseStoredDisplayMode,
  parseStoredRowDensity,
  rowHeightEstimatePx,
  WIDE_SHEET_COLUMN_COUNT,
} from "@/lib/leads/sheet-column-widths"

describe("defaultDisplayMode", () => {
  it("starts wide sheets on Key columns and others on all columns", () => {
    expect(defaultDisplayMode(WIDE_SHEET_COLUMN_COUNT)).toBe("compact")
    expect(defaultDisplayMode(WIDE_SHEET_COLUMN_COUNT + 1)).toBe("key")
    expect(defaultDisplayMode(45)).toBe("key")
    expect(defaultDisplayMode(12)).toBe("compact")
  })
})

describe("saved layout", () => {
  it("returns null when the user never picked a view, and keeps what they picked", () => {
    expect(parseStoredDisplayMode({})).toBeNull()
    expect(parseStoredDisplayMode({ displayMode: "key" })).toBe("key")
    expect(parseStoredDisplayMode({ displayMode: "compact" })).toBe("compact")
    expect(parseStoredDisplayMode({ displayMode: "full" })).toBe("full")
  })

  it("keeps the old fit-text and widths settings meaning Full text", () => {
    expect(parseStoredDisplayMode({ fitText: true })).toBe("full")
    expect(parseStoredDisplayMode({ widths: { a: 120 } })).toBe("full")
  })

  it("ignores unknown row sizes so they fall back to the default", () => {
    expect(parseStoredRowDensity({})).toBeNull()
    expect(parseStoredRowDensity({ rowDensity: "compact" })).toBe("compact")
    expect(parseStoredRowDensity({ rowDensity: "standard" })).toBe("standard")
    expect(parseStoredRowDensity({ rowDensity: "huge" as never })).toBeNull()
  })
})

describe("rowHeightEstimatePx", () => {
  it("is shorter for compact rows", () => {
    expect(rowHeightEstimatePx("compact")).toBeLessThan(rowHeightEstimatePx("standard"))
    expect(rowHeightEstimatePx("standard")).toBe(53)
  })
})
