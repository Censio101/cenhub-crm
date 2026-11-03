import { describe, expect, it } from "vitest"

import { cellTextForCopy, nextCellPosition } from "@/lib/leads/sheet-keyboard"

describe("nextCellPosition", () => {
  it("moves one cell with the arrow keys", () => {
    const from = { row: 2, col: 3 }
    expect(nextCellPosition("ArrowUp", from, 10, 8)).toEqual({ row: 1, col: 3 })
    expect(nextCellPosition("ArrowDown", from, 10, 8)).toEqual({ row: 3, col: 3 })
    expect(nextCellPosition("ArrowLeft", from, 10, 8)).toEqual({ row: 2, col: 2 })
    expect(nextCellPosition("ArrowRight", from, 10, 8)).toEqual({ row: 2, col: 4 })
  })

  it("stays put at the edges of the sheet", () => {
    expect(nextCellPosition("ArrowUp", { row: 0, col: 0 }, 10, 8)).toBeNull()
    expect(nextCellPosition("ArrowLeft", { row: 0, col: 0 }, 10, 8)).toBeNull()
    expect(nextCellPosition("ArrowDown", { row: 9, col: 7 }, 10, 8)).toBeNull()
    expect(nextCellPosition("ArrowRight", { row: 9, col: 7 }, 10, 8)).toBeNull()
  })

  it("ignores other keys", () => {
    expect(nextCellPosition("Enter", { row: 1, col: 1 }, 10, 8)).toBeNull()
    expect(nextCellPosition("a", { row: 1, col: 1 }, 10, 8)).toBeNull()
  })
})

describe("cellTextForCopy", () => {
  it("copies the visible text on one line", () => {
    expect(cellTextForCopy("  John \n madsen ")).toBe("John madsen")
  })

  it("copies nothing for an empty cell", () => {
    expect(cellTextForCopy("–")).toBe("")
    expect(cellTextForCopy("  ")).toBe("")
  })
})
