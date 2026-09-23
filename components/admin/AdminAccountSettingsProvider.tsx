"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import {
  clearLegacyAdminAccountSettings,
  DEFAULT_ADMIN_ACCOUNT_SETTINGS,
  readAdminAccountSettings,
  writeAdminAccountSettings,
  type AdminAccountSettings,
} from "@/lib/admin/admin-account-settings"

type AdminAccountSettingsContextValue = {
  settings: AdminAccountSettings
  updateSettings: (patch: Partial<AdminAccountSettings>) => void
  syncing: boolean
}

const AdminAccountSettingsContext =
  createContext<AdminAccountSettingsContextValue | null>(null)

async function fetchAdminProfileFromServer(): Promise<{
  avatarUrl: string | null
  fullName: string | null
  role: string | null
} | null> {
  const response = await fetch("/api/auth/me", { cache: "no-store" })
  if (!response.ok) return null
  const data = (await response.json()) as {
    avatarUrl?: string | null
    fullName?: string | null
    role?: string | null
  }
  return {
    avatarUrl: data.avatarUrl ?? null,
    fullName: data.fullName ?? null,
    role: data.role ?? null,
  }
}

export function AdminAccountSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { configured, user, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const userId = user?.id ?? null
  const [settings, setSettings] = useState<AdminAccountSettings>(
    DEFAULT_ADMIN_ACCOUNT_SETTINGS
  )
  const [syncing, setSyncing] = useState(false)
  const syncedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    clearLegacyAdminAccountSettings()
  }, [])

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_ADMIN_ACCOUNT_SETTINGS)
      syncedUserIdRef.current = null
      return
    }

    setSettings(readAdminAccountSettings(userId))
  }, [userId])

  useEffect(() => {
    if (!configured || authLoading || !isAuthenticated || !userId) {
      return
    }

    if (syncedUserIdRef.current === userId) {
      return
    }

    let active = true
    syncedUserIdRef.current = userId
    setSyncing(true)

    void fetchAdminProfileFromServer()
      .then((profile) => {
        if (!active || !profile || profile.role !== "censio_admin") return

        const cached = readAdminAccountSettings(userId)
        const next: AdminAccountSettings = {
          displayName: profile.fullName?.trim() || cached.displayName.trim(),
          profileImage: profile.avatarUrl?.trim() || "",
        }

        writeAdminAccountSettings(userId, next)
        setSettings(next)
      })
      .finally(() => {
        if (active) setSyncing(false)
      })

    return () => {
      active = false
    }
  }, [configured, authLoading, isAuthenticated, userId])

  const updateSettings = useCallback(
    (patch: Partial<AdminAccountSettings>) => {
      if (!userId) return

      setSettings((current) => {
        const next = { ...current, ...patch }
        writeAdminAccountSettings(userId, next)
        return next
      })
    },
    [userId]
  )

  const value = useMemo(
    () => ({ settings, updateSettings, syncing }),
    [settings, updateSettings, syncing]
  )

  return (
    <AdminAccountSettingsContext.Provider value={value}>
      {children}
    </AdminAccountSettingsContext.Provider>
  )
}

export function useAdminAccountSettings() {
  const context = useContext(AdminAccountSettingsContext)
  if (!context) {
    throw new Error(
      "useAdminAccountSettings must be used inside AdminAccountSettingsProvider"
    )
  }
  return context
}
