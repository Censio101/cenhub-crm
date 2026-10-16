"use client"

import { useEffect } from "react"

import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"
import { ensureAdminPickerListLoaded } from "@/lib/data/admin-picker-list"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"

/** Start loading the client picker list while session/bootstrap is still finishing. */
export function AdminPickerPrefetch() {
  const { useAdminShell } = useAdminClientPickerGate()
  const { configured, isAuthenticated } = useSupabaseSession()

  useEffect(() => {
    if (!configured || !isAuthenticated || !useAdminShell) return
    void ensureAdminPickerListLoaded()
  }, [configured, isAuthenticated, useAdminShell])

  return null
}
