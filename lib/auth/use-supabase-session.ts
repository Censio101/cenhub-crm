"use client"

import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"

export function useSupabaseSession() {
  const configured = isBrowserSupabaseConfigured()
  const [user, setUser] = useState<User | null>(null)
  // Set once the first answer (or auth event) arrived; only meaningful when configured.
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!configured) return

    const supabase = createClient()
    let active = true

    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user)
        setResolved(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setResolved(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [configured])

  return { configured, user, loading: configured && !resolved, isAuthenticated: Boolean(user) }
}
