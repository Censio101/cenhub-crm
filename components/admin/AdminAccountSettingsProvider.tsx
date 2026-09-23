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
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const [settings, setSettings] = useState<AdminAccountSettings>(
    DEFAULT_ADMIN_ACCOUNT_SETTINGS
  )
  const [syncing, setSyncing] = useState(false)
  const hasSyncedFromServer = useRef(false)

  useEffect(() => {
    setSettings(readAdminAccountSettings())
  }, [])

  useEffect(() => {
    if (!configured || authLoading || !isAuthenticated || hasSyncedFromServer.current) {
      return
    }

    let active = true
    hasSyncedFromServer.current = true
    setSyncing(true)

    void fetchAdminProfileFromServer()
      .then(async (profile) => {
        if (!active || !profile || profile.role !== "censio_admin") return

        const current = readAdminAccountSettings()
        const localImage = current.profileImage.trim()
        const serverImage = profile.avatarUrl?.trim() ?? ""
        const next: AdminAccountSettings = {
          displayName: current.displayName.trim() || profile.fullName?.trim() || "",
          profileImage: serverImage || localImage,
        }

        writeAdminAccountSettings(next)
        setSettings(next)

        if (localImage && !serverImage) {
          await fetch("/api/admin/me/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: localImage }),
          })
        }
      })
      .finally(() => {
        if (active) setSyncing(false)
      })

    return () => {
      active = false
    }
  }, [configured, authLoading, isAuthenticated])

  const updateSettings = useCallback((patch: Partial<AdminAccountSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      writeAdminAccountSettings(next)
      return next
    })
  }, [])

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
