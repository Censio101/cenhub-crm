"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { clearClientCaches, emitClientOrgChanged } from "@/lib/data/client-cache"
import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { ActiveOrganization } from "@/hooks/useActiveOrganization"

export type SessionUser = {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

export type SessionReloadOptions = {
  /** When true, refresh session data without toggling `loading` (no header skeleton flash). */
  silent?: boolean
}

type SessionContextValue = {
  user: SessionUser | null
  role: UserRole | null
  organization: ActiveOrganization | null
  isAdminViewingClient: boolean
  needsClientSelection: boolean
  loading: boolean
  reload: (options?: SessionReloadOptions) => Promise<void>
  setActiveOrganization: (slug: string | null) => Promise<boolean>
  /** Optimistically patch the active organization in memory (e.g. logo backdrop) without a refetch. */
  patchOrganization: (patch: Partial<ActiveOrganization>) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { configured, isAuthenticated, loading: authLoading, user: authUser } =
    useSupabaseSession()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isAdminViewingClient, setIsAdminViewingClient] = useState(false)
  const [loading, setLoading] = useState(configured)
  const sessionResolvedRef = useRef(false)

  const reload = useCallback(async (options?: SessionReloadOptions) => {
    if (!configured) {
      setLoading(false)
      return
    }

    if (!isAuthenticated) {
      sessionResolvedRef.current = false
      setUser(null)
      setOrganization(null)
      setRole(null)
      setIsAdminViewingClient(false)
      setLoading(false)
      return
    }

    const background = options?.silent ?? sessionResolvedRef.current
    if (!background) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      if (!response.ok) {
        setUser(null)
        setOrganization(null)
        setRole(null)
        setIsAdminViewingClient(false)
        return
      }

      const data = (await response.json()) as {
        userId?: string | null
        email?: string | null
        fullName?: string | null
        avatarUrl?: string | null
        role?: UserRole | null
        organization?: ActiveOrganization | null
        isAdminViewingClient?: boolean
      }

      const id = data.userId ?? authUser?.id ?? null
      setUser(
        id
          ? {
              id,
              email: data.email ?? authUser?.email ?? null,
              fullName: data.fullName ?? null,
              avatarUrl: data.avatarUrl ?? null,
            }
          : null
      )
      setRole(data.role ?? null)
      const org = data.organization ?? null
      setOrganization(
        org
          ? {
              ...org,
              logoBackground: org.logoBackground ?? "white",
              profileComplete: org.profileComplete ?? true,
            }
          : null
      )
      setIsAdminViewingClient(Boolean(data.isAdminViewingClient))
      sessionResolvedRef.current = true
    } finally {
      if (!background) {
        setLoading(false)
      }
    }
  }, [configured, isAuthenticated, authUser?.email, authUser?.id])

  useAsyncEffect(() => {
    if (authLoading) return
    void reload()
  }, [authLoading, reload, isAuthenticated, authUser?.id])

  const setActiveOrganization = useCallback(
    async (slug: string | null) => {
      clearClientCaches()

      const response = await fetch("/api/admin/active-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) return false

      await reload({ silent: true })
      emitClientOrgChanged()
      return true
    },
    [reload]
  )

  const patchOrganization = useCallback((patch: Partial<ActiveOrganization>) => {
    setOrganization((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const needsClientSelection = role === "censio_admin" && !organization

  const value = useMemo(
    (): SessionContextValue => ({
      user,
      role,
      organization,
      isAdminViewingClient,
      needsClientSelection,
      loading: loading || authLoading,
      reload,
      setActiveOrganization,
      patchOrganization,
    }),
    [
      user,
      role,
      organization,
      isAdminViewingClient,
      needsClientSelection,
      loading,
      authLoading,
      reload,
      setActiveOrganization,
      patchOrganization,
    ]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider")
  }
  return ctx
}
