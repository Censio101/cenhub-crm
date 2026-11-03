import { describe, expect, it } from "vitest"

import {
  SHEET_BOTTOM_GAP_PX,
  SHEET_FULL_WINDOW_INSET_PX,
  SHEET_MIN_HEIGHT_PX,
  computeSheetHeightPx,
} from "@/lib/leads/sheet-fit-height"

describe("computeSheetHeightPx", () => {
  it("fills the space below the sheet when it starts high on the page", () => {
    // Sheet starts right under a short header, so the space below is bigger than the window rule.
    expect(computeSheetHeightPx(1000, 60)).toBe(1000 - 60 - SHEET_BOTTOM_GAP_PX)
  })

  it("gives nearly a full window when the cards above push the sheet low", () => {
    // Pipeline card + filters put the sheet at 520px on a 900px window.
    expect(computeSheetHeightPx(900, 520)).toBe(900 - SHEET_FULL_WINDOW_INSET_PX)
  })

  it("never goes below the minimum height", () => {
    expect(computeSheetHeightPx(300, 250)).toBe(SHEET_MIN_HEIGHT_PX)
  })

  it("is never shorter than the old strip-below-the-cards result", () => {
    for (const top of [0, 200, 400, 600, 800]) {
      const old = Math.max(SHEET_MIN_HEIGHT_PX, 900 - top - SHEET_BOTTOM_GAP_PX)
      expect(computeSheetHeightPx(900, top)).toBeGreaterThanOrEqual(old)
    }
  })
})
