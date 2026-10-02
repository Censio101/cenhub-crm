import { describe, expect, it } from "vitest"

import { formatLeadDateTime, nowLeadDateTime, parseLeadDateTime } from "@/lib/leads/lead-datetime"

describe("parseLeadDateTime", () => {
  it.each([
    ["2026-03-24", { date: "2026-03-24", time: null }],
    ["2026-03-24 14:30", { date: "2026-03-24", time: "14:30" }],
    ["2026-03-24T09:05:00Z", { date: "2026-03-24", time: "09:05" }],
    ["24-03-2026", { date: "2026-03-24", time: null }],
    ["24.03.2026 14:30", { date: "2026-03-24", time: "14:30" }],
    ["4/3/2026 8:15", { date: "2026-03-04", time: "08:15" }],
  ])("reads %s", (input, expected) => {
    expect(parseLeadDateTime(input)).toEqual(expected)
  })

  it("ignores an impossible time but keeps the day", () => {
    expect(parseLeadDateTime("2026-03-24 25:99")).toEqual({ date: "2026-03-24", time: null })
  })

  it.each(["", "someday", "31-02-2026", null, undefined])("rejects %s", (input) => {
    expect(parseLeadDateTime(input)).toBeNull()
  })
})

describe("nowLeadDateTime", () => {
  it("uses the Copenhagen day and time", () => {
    // 22:30 UTC in summer is already the next day, 00:30, in Copenhagen.
    expect(nowLeadDateTime(new Date("2026-07-01T22:30:00Z"))).toEqual({
      date: "2026-07-02",
      time: "00:30",
    })
  })
})

describe("formatLeadDateTime", () => {
  it("writes the day first, then the time", () => {
    expect(formatLeadDateTime("2026-03-24", "14:30")).toBe("2026-03-24 14:30")
    expect(formatLeadDateTime("2026-03-24")).toBe("2026-03-24")
  })
})
