"use client"

import { useEffect, useRef } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isLocale } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"

function useProfileLocaleSync() {
  const { setLocale } = useLanguage()
  const { role, loading: orgLoading } = useActiveOrganization()
  const { configured, user, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const syncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!configured || authLoading || orgLoading) return

    if (!isAuthenticated || !user) {
      syncedRef.current = null
      return
    }

    if (!role) return

    const syncKey = `${user.id}:${role}`
    if (syncedRef.current === syncKey) return

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as { preferredLocale?: string }
        const next =
          data.preferredLocale && isLocale(data.preferredLocale)
            ? data.preferredLocale
            : "da"
        setLocale(next)
        syncedRef.current = syncKey
      } catch {
        // keep localStorage fallback
      }
    })()
  }, [authLoading, configured, isAuthenticated, orgLoading, role, setLocale, user])

}

/** Client dashboard shell — uses `censio-locale` (root LanguageProvider). */
export function LocaleSync() {
  useProfileLocaleSync()
  return null
}

/** Admin shell — uses `censio-admin-locale` (nested LanguageProvider in admin layout). */
export function AdminLocaleSync() {
  useProfileLocaleSync()
  return null
}

export async function persistAdminPreferredLocale(locale: Locale): Promise<boolean> {
  const response = await fetch("/api/admin/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLocale: locale }),
  })
  return response.ok
}

export async function persistAccountPreferredLocale(locale: Locale): Promise<boolean> {
  const response = await fetch("/api/account/locale", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLocale: locale }),
  })
  return response.ok
}
