import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import {
  autoFitColumnWidth,
  defaultDisplayMode,
  parseStoredDisplayMode,
  parseStoredRowDensity,
  rowHeightEstimatePx,
  SHEET_COL_NOTE_MAX,
  WIDE_SHEET_COLUMN_COUNT,
} from "@/lib/leads/sheet-column-widths"

describe("defaultDisplayMode", () => {
  it("always starts on all columns with fixed widths", () => {
    expect(defaultDisplayMode(WIDE_SHEET_COLUMN_COUNT)).toBe("compact")
    expect(defaultDisplayMode(45)).toBe("compact")
    expect(defaultDisplayMode(12)).toBe("compact")
  })
})

describe("saved layout", () => {
  it("returns null when the user never picked a view, and keeps what they picked", () => {
    expect(parseStoredDisplayMode({})).toBeNull()
    expect(parseStoredDisplayMode({ displayMode: "key" })).toBe("key") // migrated to compact in the hook
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

describe("autoFitColumnWidth for notes", () => {
  const noteCol = {
    id: "n1",
    kind: "custom",
    customField: {
      id: "cf1",
      fieldKey: "iso",
      label: "ISO info",
      fieldType: "textarea",
      required: false,
      config: {},
    },
  } as LeadSheetTemplateColumn

  it("does not grow past the note column cap even with long sample text", () => {
    const wide = "x".repeat(500)
    expect(autoFitColumnWidth(noteCol, [wide], 176)).toBeLessThanOrEqual(SHEET_COL_NOTE_MAX)
  })
})

describe("rowHeightEstimatePx", () => {
  it("is shorter for compact rows", () => {
    expect(rowHeightEstimatePx("compact")).toBeLessThan(rowHeightEstimatePx("standard"))
    expect(rowHeightEstimatePx("standard")).toBe(53)
  })
})
