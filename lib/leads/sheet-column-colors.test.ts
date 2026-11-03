import { describe, expect, it } from "vitest"

import {
  columnColorCss,
  parseStoredColumnColors,
  sheetColumnColor,
  withColumnColor,
} from "@/lib/leads/sheet-column-colors"

describe("parseStoredColumnColors", () => {
  it("keeps known colours and drops everything else", () => {
    expect(
      parseStoredColumnColors({ a: "blue", b: "red", c: 5, d: "yellow" })
    ).toEqual({ a: "blue", d: "yellow" })
  })

  it("returns nothing for missing or wrong-shaped data", () => {
    expect(parseStoredColumnColors(undefined)).toEqual({})
    expect(parseStoredColumnColors(null)).toEqual({})
    expect(parseStoredColumnColors(["blue"])).toEqual({})
    expect(parseStoredColumnColors("blue")).toEqual({})
  })
})

describe("withColumnColor", () => {
  it("sets and clears a colour without changing the original", () => {
    const start = { a: "blue" as const }
    const set = withColumnColor(start, "b", "rose")
    expect(set).toEqual({ a: "blue", b: "rose" })
    expect(start).toEqual({ a: "blue" })
    expect(withColumnColor(set, "a", null)).toEqual({ b: "rose" })
  })
})

describe("columnColorCss", () => {
  it("targets the right cell position for each coloured column", () => {
    const css = columnColorCss({ b: "green" }, ["a", "b", "c"], 0)
    expect(css).toContain("td:nth-child(2)")
    expect(css).toContain(sheetColumnColor("green")!.cell)
  })

  it("shifts by the select-box cell", () => {
    expect(columnColorCss({ a: "blue" }, ["a", "b"], 1)).toContain("td:nth-child(2)")
  })

  it("skips spacer rows and status cells", () => {
    const css = columnColorCss({ a: "blue" }, ["a"], 0)
    expect(css).toContain("tr:not([aria-hidden])")
    expect(css).toContain(":not([data-lead-status-cell])")
  })

  it("ignores columns that are not coloured or not shown", () => {
    expect(columnColorCss({ x: "blue" }, ["a", "b"], 0)).toBe("")
    expect(columnColorCss({}, ["a"], 0)).toBe("")
  })
})
