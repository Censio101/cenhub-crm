import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CAPI_MAX_EVENT_AGE_MS,
  buildWonEvent,
  isEventExpired,
  isMetaLeadId,
  isPermanentCapiError,
  postCapiEvents,
  resolveEventTime,
} from "./conversions-api"

describe("isMetaLeadId", () => {
  it("accepts the 15 to 17 digit Meta lead ID", () => {
    expect(isMetaLeadId("123456789012345")).toBe(true)
    expect(isMetaLeadId("12345678901234567")).toBe(true)
    expect(isMetaLeadId(" 1234567890123456 ")).toBe(true)
  })

  it("rejects everything else (website leads, imports, webhook ids, empty)", () => {
    expect(isMetaLeadId("12345678901234")).toBe(false)
    expect(isMetaLeadId("123456789012345678")).toBe(false)
    expect(isMetaLeadId("hook:f1:abc")).toBe(false)
    expect(isMetaLeadId("")).toBe(false)
    expect(isMetaLeadId(null)).toBe(false)
    expect(isMetaLeadId(undefined)).toBe(false)
  })
})

describe("buildWonEvent", () => {
  const event = buildWonEvent({
    eventId: "evt-1",
    metaLeadId: "12345678901234567",
    eventTimeMs: 1_761_750_000_900,
    value: 25_000,
  })

  it("follows Meta's CRM payload: system generated, from the CRM, with value and currency", () => {
    expect(event).toEqual({
      event_name: "Purchase",
      event_time: 1_761_750_000,
      event_id: "evt-1",
      action_source: "system_generated",
      user_data: { lead_id: "12345678901234567" },
      custom_data: {
        event_source: "crm",
        lead_event_source: "Censio CRM",
        value: 25_000,
        currency: "DKK",
      },
    })
  })

  it("sends the lead ID as text so a 17 digit ID never loses digits", () => {
    expect(typeof event.user_data.lead_id).toBe("string")
    expect(JSON.stringify(event)).toContain('"lead_id":"12345678901234567"')
  })
})

describe("event timing", () => {
  const NOW = Date.UTC(2026, 9, 29, 12, 0, 0)

  it("never places the event before the lead existed", () => {
    expect(resolveEventTime({ nowMs: NOW, leadCreatedMs: NOW - 5000 })).toBe(NOW)
    expect(resolveEventTime({ nowMs: NOW, leadCreatedMs: NOW + 60_000 })).toBe(NOW + 61_000)
    expect(resolveEventTime({ nowMs: NOW, leadCreatedMs: null })).toBe(NOW)
  })

  it("expires events older than Meta's 7 day limit", () => {
    expect(isEventExpired(NOW - 6 * 24 * 3600 * 1000, NOW)).toBe(false)
    expect(isEventExpired(NOW - CAPI_MAX_EVENT_AGE_MS, NOW)).toBe(false)
    expect(isEventExpired(NOW - CAPI_MAX_EVENT_AGE_MS - 1, NOW)).toBe(true)
    expect(isEventExpired(NOW - 8 * 24 * 3600 * 1000, NOW)).toBe(true)
  })
})

describe("isPermanentCapiError", () => {
  it("treats an invalid parameter (code 100) as permanent and others as temporary", () => {
    expect(isPermanentCapiError({ error: { code: 100 } })).toBe(true)
    expect(isPermanentCapiError({ error: { code: 190 } })).toBe(false)
    expect(isPermanentCapiError({ error: { code: 4 } })).toBe(false)
    expect(isPermanentCapiError(null)).toBe(false)
  })
})

describe("postCapiEvents", () => {
  afterEach(() => vi.unstubAllGlobals())

  const event = buildWonEvent({
    eventId: "e",
    metaLeadId: "123456789012345",
    eventTimeMs: 1_000_000,
    value: 10,
  })

  it("posts to the pixel's events edge with the token, and a test code when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await postCapiEvents("999", "tok", [event], { testEventCode: "TEST123" })

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/graph\.facebook\.com\/v[\d.]+\/999\/events$/)
    const body = JSON.parse(String((init as RequestInit).body))
    expect(body).toMatchObject({ access_token: "tok", test_event_code: "TEST123" })
    expect(body.data).toHaveLength(1)
  })

  it("reports Meta's error and whether it is worth retrying", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Invalid lead_id", code: 100 } }), {
          status: 400,
        })
      )
    )
    const result = await postCapiEvents("999", "tok", [event])
    expect(result).toMatchObject({ ok: false, error: "Invalid lead_id", permanent: true })
  })

  it("never throws when Meta cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    const result = await postCapiEvents("999", "tok", [event])
    expect(result).toMatchObject({ ok: false, error: "network down", permanent: false })
  })
})
