import { describe, expect, it } from "vitest"

import {
  computeDelta,
  computeProfit,
  getMetric,
  safeDivide,
} from "./metrics"
import type { PeriodTotals } from "./types"

const baseTotals = (overrides: Partial<PeriodTotals> = {}): PeriodTotals => ({
  leads: 100,
  customers: 25,
  revenue: 200000,
  adSpend: 50000,
  ...overrides,
})

describe("metric calculations", () => {
  it("computes LTV as revenue divided by closed customers", () => {
    expect(getMetric("ltv").compute(baseTotals())).toBe(8000)
  })

  it("computes CAC as ad spend divided by customers", () => {
    expect(getMetric("cac").compute(baseTotals())).toBe(2000)
  })

  it("returns null for LTV when there are no customers", () => {
    expect(getMetric("ltv").compute(baseTotals({ customers: 0 }))).toBeNull()
  })

  it("computes CPL as ad spend divided by leads", () => {
    expect(getMetric("cpl").compute(baseTotals())).toBe(500)
  })

  it("computes close rate as customers / leads * 100", () => {
    expect(getMetric("closeRate").compute(baseTotals())).toBe(25)
  })

  it("returns null for CAC when there are no customers", () => {
    expect(getMetric("cac").compute(baseTotals({ customers: 0 }))).toBeNull()
  })

  it("returns null for CPL and close rate when there are no leads", () => {
    const totals = baseTotals({ leads: 0, customers: 0 })
    expect(getMetric("cpl").compute(totals)).toBeNull()
    expect(getMetric("closeRate").compute(totals)).toBeNull()
  })

  it("never returns Infinity or NaN from safeDivide", () => {
    expect(safeDivide(10, 0)).toBeNull()
    expect(safeDivide(Number.NaN, 2)).toBeNull()
    expect(safeDivide(10, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it("falls back to revenue minus ad spend for bundlinje", () => {
    expect(computeProfit(baseTotals({ profit: null }))).toBe(150000)
    expect(getMetric("profit").compute(baseTotals({ profit: null }))).toBe(
      150000
    )
  })

  it("uses provided profit when present", () => {
    expect(computeProfit(baseTotals({ profit: 88000 }))).toBe(88000)
    expect(getMetric("profit").compute(baseTotals({ profit: 88000 }))).toBe(
      88000
    )
  })

  it("treats a CAC decrease as a positive change", () => {
    const delta = computeDelta(1200, 1500, "down")
    expect(delta.direction).toBe("down")
    expect(delta.isPositive).toBe(true)
    expect(delta.percent).toBeCloseTo(-20)
  })

  it("treats a revenue decrease as a negative change", () => {
    const delta = computeDelta(80, 100, "up")
    expect(delta.direction).toBe("down")
    expect(delta.isPositive).toBe(false)
  })
})
