export type JsonFetchResult<T> = {
  ok: boolean
  status: number
  /** `null` when the body was not valid JSON. */
  data: T | null
}

const inFlight = new Map<string, Promise<JsonFetchResult<unknown>>>()

/**
 * GET a JSON endpoint, sharing one request between callers that ask for the same URL at the
 * same time (e.g. the dashboard and the leads sheet both read `/api/leads`).
 * The shared entry is dropped as soon as the request settles.
 */
export function fetchJsonDeduped<T>(url: string): Promise<JsonFetchResult<T>> {
  const existing = inFlight.get(url)
  if (existing) return existing as Promise<JsonFetchResult<T>>

  const promise: Promise<JsonFetchResult<unknown>> = (async () => {
    const response = await fetch(url, { cache: "no-store" })
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  })().finally(() => {
    if (inFlight.get(url) === promise) inFlight.delete(url)
  })

  inFlight.set(url, promise)
  return promise as Promise<JsonFetchResult<T>>
}

/** Forget shared requests (on client switch) so the new client never joins an old request. */
export function clearInFlightRequests() {
  inFlight.clear()
}
