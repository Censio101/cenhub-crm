import { describe, expect, it } from "vitest"

import {
  applyFieldMapping,
  normalizeLeadDate,
  parseCanonicalInbound,
  todayLeadDate,
} from "@/lib/leads/inbound-payload"

describe("normalizeLeadDate", () => {
  it.each([
    ["2026-03-24", "2026-03-24"],
    ["2026-03-24 14:30", "2026-03-24"],
    ["2026-03-24T23:30:00Z", "2026-03-24"],
    ["24-03-2026", "2026-03-24"],
    ["24.03.2026 14:30", "2026-03-24"],
    ["4/3/2026", "2026-03-04"],
  ])("reads %s", (input, expected) => {
    expect(normalizeLeadDate(input)).toBe(expected)
  })

  it.each(["", "someday", "31-02-2026", "40.01.2026", null, undefined])("rejects %s", (input) => {
    expect(normalizeLeadDate(input)).toBeNull()
  })
})

describe("parseCanonicalInbound leadDate", () => {
  const base = { fullName: "Jane Doe", email: "jane@example.com" }

  const withPhone = { ...base, phone: "12345678" }

  it("keeps the day and the time from a date-time string", () => {
    const result = parseCanonicalInbound({ ...withPhone, leadDate: "2026-03-24 14:30" })
    expect(result).toMatchObject({ ok: true, warnings: [] })
    expect(result.ok && result.lead.leadDate).toBe("2026-03-24")
    expect(result.ok && result.lead.leadTime).toBe("14:30")
  })

  it("keeps a day sent without a time as a day only", () => {
    const result = parseCanonicalInbound({ ...withPhone, leadDate: "24-03-2026" })
    expect(result.ok && result.lead.leadDate).toBe("2026-03-24")
    expect(result.ok && result.lead.leadTime).toBeUndefined()
  })

  it("fills in today and the current time without a warning when omitted", () => {
    const result = parseCanonicalInbound(withPhone)
    expect(result).toMatchObject({ ok: true, warnings: [] })
    expect(result.ok && result.lead.leadDate).toBe(todayLeadDate())
    expect(result.ok && result.lead.leadTime).toMatch(/^\d{2}:\d{2}$/)
  })

  it("defaults to today with a warning when unreadable, and still saves the lead", () => {
    const result = parseCanonicalInbound({ ...withPhone, leadDate: "last tuesday" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.lead.leadDate).toBe(todayLeadDate())
      expect(result.warnings).toEqual([expect.objectContaining({ field: "leadDate" })])
    }
  })

  it("saves a lead with a missing name, email or phone and reports a warning", () => {
    const noName = parseCanonicalInbound({ email: "a@b.c", phone: "1" })
    expect(noName.ok && noName.warnings).toEqual([expect.objectContaining({ field: "fullName" })])
    const noPhone = parseCanonicalInbound({ fullName: "Jane", email: "a@b.c" })
    expect(noPhone.ok && noPhone.warnings).toEqual([expect.objectContaining({ field: "phone" })])
    const noEmail = parseCanonicalInbound({ fullName: "Jane", phone: "1" })
    expect(noEmail.ok && noEmail.warnings).toEqual([expect.objectContaining({ field: "email" })])
  })

  it("refuses a lead that has no name, email or phone at all", () => {
    expect(parseCanonicalInbound({ city: "Aarhus" })).toMatchObject({ ok: false })
  })
})

describe("applyFieldMapping", () => {
  it("maps standard targets and nested source paths", () => {
    const out = applyFieldMapping(
      { contact: { name: "Jane" }, mail: "j@x.dk" },
      { fullName: "contact.name", email: "mail" }
    )
    expect(out).toMatchObject({ fullName: "Jane", email: "j@x.dk" })
  })

  it("routes customFields.<key> targets into the customFields object", () => {
    const out = applyFieldMapping(
      { answers: { size: "120", roof: "Tile" }, customFields: { existing: "keep" } },
      { "customFields.house_size": "answers.size", "customFields.roof_type": "answers.roof" }
    )
    expect(out.customFields).toEqual({
      existing: "keep",
      house_size: "120",
      roof_type: "Tile",
    })
  })

  it("ignores custom targets whose source is missing or key is empty", () => {
    const out = applyFieldMapping({ a: 1 }, { "customFields.x": "nope", "customFields.": "a" })
    expect(out.customFields).toBeUndefined()
  })
})
