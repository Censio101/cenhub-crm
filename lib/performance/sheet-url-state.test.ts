import { describe, expect, it } from "vitest"

import { parseSheetParams, sheetStateToParams } from "./sheet-url-state"

describe("parseSheetParams", () => {
  it("defaults to all time when the URL has no date params", () => {
    const view = parseSheetParams(new URLSearchParams(""), new Date("2026-10-15T12:00:00Z"))
    expect(view.preset).toBe("all_time")
  })

  it("does not read dashboard-only params like metric or compare", () => {
    const params = new URLSearchParams(
      "preset=this_month&from=2026-10-01&to=2026-10-15&metric=revenue&compare=year"
    )
    const view = parseSheetParams(params, new Date("2026-10-15T12:00:00Z"))
    expect(view.preset).toBe("this_month")
    const roundTrip = new URLSearchParams(sheetStateToParams(view))
    expect(roundTrip.has("metric")).toBe(false)
    expect(roundTrip.has("compare")).toBe(false)
  })
})
