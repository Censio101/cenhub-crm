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
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    let active = true

    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [configured])

  return { configured, user, loading, isAuthenticated: Boolean(user) }
}
