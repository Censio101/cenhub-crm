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

import { sanitizeStoredProfileImage } from "@/lib/auth/profile-image-sanitize"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { fetchJsonDeduped } from "@/lib/data/in-flight"
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
  // Same request the session provider makes at load; shared so the server is asked once.
  const result = await fetchJsonDeduped<{
    avatarUrl?: string | null
    fullName?: string | null
    role?: string | null
  }>("/api/auth/me")
  if (!result.ok || !result.data) return null
  return {
    avatarUrl: result.data.avatarUrl ?? null,
    fullName: result.data.fullName ?? null,
    role: result.data.role ?? null,
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
    if (!userId) return
    const cached = readAdminAccountSettings(userId)
    const cleanedImage = sanitizeStoredProfileImage(cached.profileImage)
    if (cleanedImage !== cached.profileImage) {
      writeAdminAccountSettings(userId, { ...cached, profileImage: cleanedImage })
    }
  }, [userId])

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
          profileImage:
            sanitizeStoredProfileImage(profile.avatarUrl) ||
            sanitizeStoredProfileImage(cached.profileImage),
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
