"use client"

import { useEffect } from "react"

import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { useKeyedState } from "@/lib/react/use-keyed-state"

type UserProfile = {
  userId: string | null
  role: UserRole | null
  loading: boolean
}

type Fetched = { resolved: boolean; role: UserRole | null; userId: string | null }

const NOT_FETCHED: Fetched = { resolved: false, role: null, userId: null }

export function useUserProfile(): UserProfile {
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  // The fetched profile belongs to one signed-in state; it resets on sign-in and sign-out.
  const [fetched, setFetched] = useKeyedState<Fetched>(NOT_FETCHED, isAuthenticated)

  useEffect(() => {
    if (!configured || authLoading || !isAuthenticated) return

    let active = true
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return
        setFetched({ resolved: true, userId: data?.userId ?? null, role: data?.role ?? null })
      })
      .catch(() => {
        if (!active) return
        setFetched({ resolved: true, userId: null, role: null })
      })

    return () => {
      active = false
    }
  }, [configured, isAuthenticated, authLoading, setFetched])

  const fetching = configured && isAuthenticated && !fetched.resolved
  return {
    userId: isAuthenticated ? fetched.userId : null,
    role: isAuthenticated ? fetched.role : null,
    loading: fetching || authLoading,
  }
}
