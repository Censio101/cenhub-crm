/**
 * Sequences async loads so only the most recently started one may apply its result.
 *
 * `begin()` returns an `isCurrent()` check. After every `await`, a loader calls it and bails out
 * when a newer request started (e.g. the admin switched client) or the owner was disposed
 * (unmount) — so a slow response for the previous client can never overwrite newer data.
 */
export type RequestGuard = {
  begin: () => () => boolean
  /** Invalidates every outstanding request (call on unmount). */
  dispose: () => void
}

export function createRequestGuard(): RequestGuard {
  let sequence = 0
  return {
    begin() {
      const mine = ++sequence
      return () => mine === sequence
    },
    dispose() {
      sequence += 1
    },
  }
}
