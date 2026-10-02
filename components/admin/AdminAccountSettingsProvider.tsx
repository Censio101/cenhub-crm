"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { subscribeToStorage } from "@/lib/react/storage-store"
import {
  clearLegacyAdminAccountSettings,
  parseAdminAccountSettings,
  readAdminAccountSettings,
  readAdminAccountSettingsRaw,
  writeAdminAccountSettings,
  type AdminAccountSettings,
} from "@/lib/admin/admin-account-settings"

type AdminAccountSettingsContextValue = {
  settings: AdminAccountSettings
  updateSettings: (patch: Partial<AdminAccountSettings>) => void
  syncing: boolean
}

const AdminAccountSettingsContext = createContext<AdminAccountSettingsContextValue | null>(null)

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

export function AdminAccountSettingsProvider({ children }: { children: React.ReactNode }) {
  const { configured, user, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const userId = user?.id ?? null
  // Stored per user in localStorage; the server and first client render use the defaults.
  const raw = useSyncExternalStore(
    subscribeToStorage,
    () => readAdminAccountSettingsRaw(userId),
    () => null
  )
  const settings = useMemo(() => parseAdminAccountSettings(raw), [raw])
  const [syncing, setSyncing] = useState(false)
  const syncedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    clearLegacyAdminAccountSettings()
  }, [])

  useEffect(() => {
    if (!configured || authLoading || !isAuthenticated || !userId) {
      if (!userId) syncedUserIdRef.current = null
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

      writeAdminAccountSettings(userId, { ...readAdminAccountSettings(userId), ...patch })
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
    throw new Error("useAdminAccountSettings must be used inside AdminAccountSettingsProvider")
  }
  return context
}
