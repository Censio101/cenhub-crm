"use client"

import type { User } from "@supabase/supabase-js"
import { useSyncExternalStore } from "react"

import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"

type Snapshot = {
  user: User | null
  /** True once the first answer (or auth event) arrived; only meaningful when configured. */
  resolved: boolean
}

const SERVER_SNAPSHOT: Snapshot = { user: null, resolved: false }

/**
 * One shared session for the whole app.
 *
 * This hook is used by many components (header, profile menu, locale sync, ...). It used to make
 * its own `auth.getUser()` network call per component; the Supabase browser client runs those one
 * after another, so a page load queued a dozen calls and the header waited for the last one.
 * Now there is a single subscription. The first value comes from the session already stored in
 * the browser (no network round trip). That is only used for UI state: every API route and the
 * middleware still verify the user on the server.
 */
let snapshot: Snapshot = SERVER_SNAPSHOT
let started = false
const listeners = new Set<() => void>()

function publish(next: Snapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function ensureStarted() {
  if (started || typeof window === "undefined" || !isBrowserSupabaseConfigured()) return
  started = true

  const supabase = createClient()
  // Fires once right away with the stored session (INITIAL_SESSION), then on every change.
  supabase.auth.onAuthStateChange((_event, session) => {
    publish({ user: session?.user ?? null, resolved: true })
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  ensureStarted()
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Snapshot {
  return snapshot
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT
}

export function useSupabaseSession() {
  const configured = isBrowserSupabaseConfigured()
  const { user, resolved } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return { configured, user, loading: configured && !resolved, isAuthenticated: Boolean(user) }
}
