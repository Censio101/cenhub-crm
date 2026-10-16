"use client"

import { useEffect, useRef } from "react"

import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client"

const DEBOUNCE_MS = 500

/**
 * When the leads table changes for this org (webhook, Meta, another user), refetch via the
 * existing /api/leads path so hidden columns and mapping stay server-authoritative.
 */
export function useLeadsLiveSync(
  organizationId: string | null | undefined,
  enabled: boolean,
  onRemoteChange: () => void
) {
  const onChangeRef = useRef(onRemoteChange)
  onChangeRef.current = onRemoteChange

  useEffect(() => {
    if (!enabled || !organizationId || !isBrowserSupabaseConfigured()) return

    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleReload = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        onChangeRef.current()
      }, DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`org-leads-live-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          scheduleReload()
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [organizationId, enabled])
}
