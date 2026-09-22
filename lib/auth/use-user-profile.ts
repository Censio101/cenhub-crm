"use client"

import { useEffect, useState } from "react"

import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"

type UserProfile = {
  userId: string | null
  role: UserRole | null
  loading: boolean
}

export function useUserProfile(): UserProfile {
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    if (authLoading) return

    if (!isAuthenticated) {
      setRole(null)
      setUserId(null)
      setLoading(false)
      return
    }

    let active = true
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return
        setUserId(data?.userId ?? null)
        setRole(data?.role ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setRole(null)
        setUserId(null)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [configured, isAuthenticated, authLoading])

  return { userId, role, loading: loading || authLoading }
}
