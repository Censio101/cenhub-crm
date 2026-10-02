"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useAsyncEffect } from "@/lib/react/use-async-effect"

type SampleDto = {
  listeningSeconds: number | null
  receivedAt: string | null
  error: string | null
  sample: Record<string, unknown> | null
}

export type FunnelSampleState = {
  /** The captured body, or null. */
  sample: Record<string, unknown> | null
  receivedAt: string | null
  /** Why the last request could not be used. */
  error: string | null
  /** When the listening window ends (ms since epoch), or null when not listening. */
  listeningEndsAt: number | null
  loaded: boolean
  busy: boolean
}

/** What the Funnels page keeps about a webhook's sample. */
export type FunnelSamplePatch = {
  hasSample: boolean
  sampleReceivedAt: string | null
  listeningSeconds: number | null
}

const POLL_MS = 2000

/**
 * A webhook's sample: loads it, starts/stops/clears listening, and polls every 2 s while the
 * webhook is listening (paused while the tab is hidden, stopped on unmount).
 */
export function useFunnelSample(
  slug: string,
  funnelId: string,
  onChange?: (patch: FunnelSamplePatch) => void
) {
  const endpoint = `/api/admin/organizations/${slug}/funnels/${funnelId}/sample`
  const [state, setState] = useState<FunnelSampleState>({
    sample: null,
    receivedAt: null,
    error: null,
    listeningEndsAt: null,
    loaded: false,
    busy: false,
  })
  const [actionError, setActionError] = useState(false)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const apply = useCallback((dto: SampleDto) => {
    setState((current) => ({
      ...current,
      sample: dto.sample,
      receivedAt: dto.receivedAt,
      error: dto.error,
      listeningEndsAt:
        dto.listeningSeconds === null ? null : Date.now() + dto.listeningSeconds * 1000,
      loaded: true,
      busy: false,
    }))
    onChangeRef.current?.({
      hasSample: dto.sample !== null,
      sampleReceivedAt: dto.receivedAt,
      listeningSeconds: dto.listeningSeconds,
    })
  }, [])

  useAsyncEffect(
    async (signal) => {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error("load")
        const dto = (await res.json()) as SampleDto
        if (!signal.cancelled) apply(dto)
      } catch {
        if (!signal.cancelled) setState((current) => ({ ...current, loaded: true }))
      }
    },
    [endpoint, apply]
  )

  const listening = state.listeningEndsAt !== null
  useEffect(() => {
    if (!listening) return
    let stopped = false
    const timer = window.setInterval(async () => {
      if (document.hidden) return
      try {
        const res = await fetch(endpoint)
        if (!res.ok || stopped) return
        apply((await res.json()) as SampleDto)
      } catch {
        // Keep polling; a failed poll is not worth interrupting the wait.
      }
    }, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [listening, endpoint, apply])

  const send = useCallback(
    async (action: "listen" | "stop" | "clear") => {
      setState((current) => ({ ...current, busy: true }))
      setActionError(false)
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
        if (!res.ok) throw new Error(action)
        apply((await res.json()) as SampleDto)
        return true
      } catch {
        setState((current) => ({ ...current, busy: false }))
        setActionError(true)
        return false
      }
    },
    [endpoint, apply]
  )

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(endpoint)
      if (res.ok) apply((await res.json()) as SampleDto)
    } catch {
      // The next poll or action will bring the state up to date.
    }
  }, [endpoint, apply])

  return {
    state,
    actionError,
    refresh,
    listen: () => send("listen"),
    stop: () => send("stop"),
    clear: () => send("clear"),
  }
}
