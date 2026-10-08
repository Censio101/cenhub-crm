import { afterEach, describe, expect, it, vi } from "vitest"

import { clearInFlightRequests, fetchJsonDeduped } from "@/lib/data/in-flight"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  clearInFlightRequests()
  vi.unstubAllGlobals()
})

describe("fetchJsonDeduped", () => {
  it("shares one request between simultaneous callers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: 1 }))
    vi.stubGlobal("fetch", fetchMock)

    const [a, b] = await Promise.all([
      fetchJsonDeduped<{ ok: number }>("/api/leads"),
      fetchJsonDeduped<{ ok: number }>("/api/leads"),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a.data).toEqual({ ok: 1 })
    expect(b.data).toEqual({ ok: 1 })
  })

  it("fetches again once the previous request settled", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: 1 }))
    vi.stubGlobal("fetch", fetchMock)

    await fetchJsonDeduped("/api/leads")
    await fetchJsonDeduped("/api/leads")

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("starts a fresh request after the in-flight map is cleared (client switch)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: 1 }))
    vi.stubGlobal("fetch", fetchMock)

    const first = fetchJsonDeduped("/api/leads")
    clearInFlightRequests()
    const second = fetchJsonDeduped("/api/leads")
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reports failures with status and null data for non-JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })))

    const result = await fetchJsonDeduped("/api/leads")

    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
    expect(result.data).toBeNull()
  })
})
