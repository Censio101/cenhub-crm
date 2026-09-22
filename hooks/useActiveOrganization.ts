"use client"

import { useCallback, useEffect, useState } from "react"

import { clearClientCaches, emitClientOrgChanged } from "@/lib/data/client-cache"
import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"

export type ActiveOrganization = {
  id: string
  slug: string
  name: string
  demoMode: boolean
}

type ActiveOrganizationState = {
  organization: ActiveOrganization | null
  role: UserRole | null
  isAdminViewingClient: boolean
  needsClientSelection: boolean
  loading: boolean
  setActiveOrganization: (slug: string | null) => Promise<boolean>
  reload: () => Promise<void>
}

export function useActiveOrganization(): ActiveOrganizationState {
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isAdminViewingClient, setIsAdminViewingClient] = useState(false)
  const [loading, setLoading] = useState(configured)

  const reload = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }

    if (!isAuthenticated) {
      setOrganization(null)
      setRole(null)
      setIsAdminViewingClient(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      if (!response.ok) {
        setOrganization(null)
        setRole(null)
        setIsAdminViewingClient(false)
        return
      }

      const data = (await response.json()) as {
        role?: UserRole | null
        organization?: ActiveOrganization | null
        isAdminViewingClient?: boolean
      }

      setRole(data.role ?? null)
      setOrganization(data.organization ?? null)
      setIsAdminViewingClient(Boolean(data.isAdminViewingClient))
    } finally {
      setLoading(false)
    }
  }, [configured, isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    void reload()
  }, [authLoading, reload])

  const setActiveOrganization = useCallback(async (slug: string | null) => {
    clearClientCaches()

    const response = await fetch("/api/admin/active-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ slug }),
    })

    if (!response.ok) return false

    await reload()
    emitClientOrgChanged()
    return true
  }, [reload])

  const needsClientSelection = role === "censio_admin" && !organization

  return {
    organization,
    role,
    isAdminViewingClient,
    needsClientSelection,
    loading: loading || authLoading,
    setActiveOrganization,
    reload,
  }
}
