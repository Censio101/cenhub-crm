import { describe, expect, it } from "vitest"

import {
  isLogoStep,
  logoChipStyle,
  logoImageMaxHeightPx,
  logoOffsetTranslateYpx,
  parseLogoStep,
} from "@/lib/organization-logo"

describe("logo chip style", () => {
  it("only accepts whole steps from 0 to 4", () => {
    expect([0, 1, 2, 3, 4].every(isLogoStep)).toBe(true)
    expect([-1, 5, 1.5, "2", null, undefined].some(isLogoStep)).toBe(false)
  })

  it("falls back to the original look (step 2) for anything else", () => {
    expect(parseLogoStep(undefined)).toBe(2)
    expect(parseLogoStep(9)).toBe(2)
    expect(parseLogoStep(3)).toBe(3)
  })

  it("step 2 keeps the look the logo had before, step 0 removes padding and rounding", () => {
    expect(logoChipStyle("header", 2, 2)).toEqual({ padding: "4px 12px", borderRadius: "12px" })
    expect(logoChipStyle("header", 0, 0)).toEqual({ padding: "0px 0px", borderRadius: "0px" })
    expect(logoChipStyle("stage", 2, 2)).toEqual({ padding: "14px 20px", borderRadius: "16px" })
  })

  it("grows with each step and the last radius step is a pill", () => {
    const paddings = [0, 1, 2, 3, 4].map((step) =>
      parseInt(logoChipStyle("stage", step, 2).padding as string, 10)
    )
    expect([...paddings].sort((a, b) => a - b)).toEqual(paddings)
    expect(logoChipStyle("header", 2, 4).borderRadius).toBe("999px")
  })

  it("scales logo image height with the size step", () => {
    expect(logoImageMaxHeightPx("header", 2)).toBe(40)
    expect(logoImageMaxHeightPx("header", 4)).toBeGreaterThan(logoImageMaxHeightPx("header", 0))
  })

  it("nudges logo vertically around center at step 2", () => {
    expect(logoOffsetTranslateYpx(2)).toBe(0)
    expect(logoOffsetTranslateYpx(0)).toBeLessThan(0)
    expect(logoOffsetTranslateYpx(4)).toBeGreaterThan(0)
  })
})
