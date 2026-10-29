import { describe, expect, it } from "vitest"

import { monthKeysInRange } from "./ad-spend-for-range"
import { resolveAllTimeStart, resolveMeasuredRange } from "./all-time"
import { previousPeriod, resolvePreset, toIsoDate } from "./date-ranges"
import type { Lead } from "@/lib/leads"

function lead(date: string): Lead {
  return { id: date, date } as unknown as Lead
}

describe("resolveAllTimeStart", () => {
  it("starts at the first ad-spend month when ads ran before the first lead", () => {
    const start = resolveAllTimeStart({
      leads: [lead("2026-09-29"), lead("2026-10-28")],
      adSpendByMonth: { "2026-05": 5000, "2026-06": 4000, "2026-10": 100 },
    })
    expect(start && toIsoDate(start)).toBe("2026-05-01")
  })

  it("starts at the first lead when it is earlier than any ad spend", () => {
    const start = resolveAllTimeStart({
      leads: [lead("2026-01-15")],
      adSpendByMonth: { "2026-03": 1000 },
    })
    expect(start && toIsoDate(start)).toBe("2026-01-15")
  })

  it("ignores empty ad months and returns null with no data", () => {
    expect(resolveAllTimeStart({ leads: [], adSpendByMonth: { "2026-03": 0 } })).toBeNull()
  })
})

describe("resolveMeasuredRange", () => {
  it("clamps all time to where the data starts and leaves other presets alone", () => {
    const input = { leads: [lead("2026-09-29")], adSpendByMonth: { "2026-05": 5000 } }
    const all = resolvePreset("all_time", new Date(2026, 9, 29))
    const measured = resolveMeasuredRange("all_time", all, input)
    expect(toIsoDate(measured.start)).toBe("2026-05-01")
    expect(measured.end).toEqual(all.end)

    const ytd = resolvePreset("ytd", new Date(2026, 9, 29))
    expect(resolveMeasuredRange("ytd", ytd, input)).toBe(ytd)
  })
})

describe("monthKeysInRange", () => {
  it("includes the last month even across decades (all-time style ranges)", () => {
    const keys = monthKeysInRange({
      start: new Date(2000, 0, 1),
      end: new Date(2026, 9, 29, 23, 59, 59),
    })
    expect(keys[0]).toBe("2000-01")
    expect(keys.at(-1)).toBe("2026-10")
    expect(keys).toHaveLength(26 * 12 + 10)
  })
})

describe("previousPeriod for months", () => {
  it("compares a full month to the full month before it", () => {
    const previous = previousPeriod({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) })
    expect(toIsoDate(previous.start)).toBe("2026-08-01")
    expect(toIsoDate(previous.end)).toBe("2026-08-31")
  })

  it("compares month to date with the same elapsed days of the month before", () => {
    const previous = previousPeriod({ start: new Date(2026, 9, 1), end: new Date(2026, 9, 29) })
    expect(toIsoDate(previous.start)).toBe("2026-09-01")
    expect(toIsoDate(previous.end)).toBe("2026-09-29")
  })

  it("caps at the shorter month and handles January", () => {
    const march = previousPeriod({ start: new Date(2026, 2, 1), end: new Date(2026, 2, 30) })
    expect(toIsoDate(march.end)).toBe("2026-02-28")
    const january = previousPeriod({ start: new Date(2026, 0, 1), end: new Date(2026, 0, 10) })
    expect(toIsoDate(january.start)).toBe("2025-12-01")
    expect(toIsoDate(january.end)).toBe("2025-12-10")
  })

  it("keeps equal-length windows for ranges that are not a single month", () => {
    const previous = previousPeriod({ start: new Date(2026, 9, 5), end: new Date(2026, 9, 15) })
    expect(toIsoDate(previous.start)).toBe("2026-09-24")
    expect(toIsoDate(previous.end)).toBe("2026-10-04")
  })
})
