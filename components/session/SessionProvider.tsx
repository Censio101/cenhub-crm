"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { clearClientCaches, emitClientOrgChanged } from "@/lib/data/client-cache"
import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client"
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
  const [loading, setLoading] = useState(false)
  const sessionResolvedRef = useRef(false)
  /** Only the most recently started session fetch may write state (stale responses are dropped). */
  const reloadSeqRef = useRef(0)

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) return
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        sessionResolvedRef.current = false
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const reload = useCallback(async (options?: SessionReloadOptions) => {
    const seq = ++reloadSeqRef.current
    const isStale = () => seq !== reloadSeqRef.current

    if (!configured) {
      setLoading(false)
      return
    }

    const clearSessionState = () => {
      sessionResolvedRef.current = false
      setUser(null)
      setOrganization(null)
      setRole(null)
      setIsAdminViewingClient(false)
    }

    type MePayload = {
      userId?: string | null
      email?: string | null
      fullName?: string | null
      avatarUrl?: string | null
      role?: UserRole | null
      organization?: ActiveOrganization | null
      isAdminViewingClient?: boolean
    }

    const applyMePayload = (data: MePayload) => {
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
      if (data.role === "censio_admin" && !data.organization) {
        clearClientCaches()
      }
    }

    if (!isAuthenticated) {
      if (!sessionResolvedRef.current) {
        clearSessionState()
        setLoading(false)
        return
      }
      // Supabase can briefly report no user during refresh; confirm with the server before wiping CRM session.
      const verifyBackground = options?.silent ?? true
      if (!verifyBackground) {
        setLoading(true)
      }
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        })
        if (isStale()) return
        if (response.status === 401 || response.status === 403) {
          clearSessionState()
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as MePayload
        if (isStale()) return
        applyMePayload(data)
      } finally {
        if (!isStale()) {
          setLoading(false)
        }
      }
      return
    }

    const background = options?.silent ?? sessionResolvedRef.current
    if (!background) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      })
      if (isStale()) return
      if (!response.ok) {
        // A transient server error must not wipe a session we already resolved.
        if (response.status === 401 || response.status === 403 || !sessionResolvedRef.current) {
          clearSessionState()
        }
        return
      }

      const data = (await response.json()) as MePayload
      if (isStale()) return

      applyMePayload(data)
    } finally {
      // Only the latest fetch settles `loading`; an older one must not end it early.
      if (!isStale()) {
        setLoading(false)
      }
    }
  }, [configured, isAuthenticated, authLoading, authUser?.email, authUser?.id])

  useAsyncEffect(() => {
    if (authLoading) return
    void reload()
  }, [authLoading, reload, isAuthenticated, authUser?.id])

  const setActiveOrganization = useCallback(
    async (slug: string | null) => {
      // Drop in-flight /api/auth/me responses (e.g. right after login before the cookie clears).
      reloadSeqRef.current += 1
      if (!slug?.trim()) {
        setOrganization(null)
        setIsAdminViewingClient(false)
      }

      clearClientCaches()

      const response = await fetch("/api/admin/active-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) return false

      const data = (await response.json()) as {
        organization?: {
          id: string
          slug: string
          name: string
          demoMode: boolean
        } | null
      }

      if (data.organization) {
        setOrganization({
          id: data.organization.id,
          slug: data.organization.slug,
          name: data.organization.name,
          demoMode: data.organization.demoMode,
          logoUrl: null,
          logoBackground: "white",
          profileComplete: true,
        })
        setIsAdminViewingClient(true)
      } else if (!slug?.trim()) {
        setOrganization(null)
        setIsAdminViewingClient(false)
      }

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
      loading: loading || (authLoading && !sessionResolvedRef.current),
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
