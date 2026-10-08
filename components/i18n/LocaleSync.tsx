"use client"

import { useEffect, useRef } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isLocale } from "@/lib/i18n"
import { readStoredLocale, writeStoredLocale } from "@/lib/i18n/stored-locale"
import {
  ADMIN_LOCALE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/types"

/** Keep legacy admin key aligned so older tabs / bookmarks do not fight the main key. */
export function mirrorLocaleStorageKeys(locale: Locale) {
  writeStoredLocale(LOCALE_STORAGE_KEY, locale)
  writeStoredLocale(ADMIN_LOCALE_STORAGE_KEY, locale)
}

function useProfileLocaleSync() {
  const { locale, setLocale } = useLanguage()
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
        const stored = readStoredLocale(LOCALE_STORAGE_KEY)

        syncedRef.current = syncKey

        // User already picked a locale locally (e.g. before profile sync finished) — keep it.
        if (stored !== next && stored !== "da") {
          mirrorLocaleStorageKeys(stored)
          if (stored !== locale) setLocale(stored)
          return
        }

        if (next === locale) {
          mirrorLocaleStorageKeys(next)
          return
        }

        mirrorLocaleStorageKeys(next)
        setLocale(next)
      } catch {
        // keep localStorage fallback
      }
    })()
  }, [authLoading, configured, isAuthenticated, orgLoading, role, setLocale, user])
}

/** Sync profile preferred_locale into the app LanguageProvider (all signed-in areas). */
export function LocaleSync() {
  useProfileLocaleSync()
  return null
}

export async function persistAdminPreferredLocale(locale: Locale): Promise<boolean> {
  const response = await fetch("/api/admin/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLocale: locale }),
  })
  if (response.ok) {
    mirrorLocaleStorageKeys(locale)
  }
  return response.ok
}

export async function persistAccountPreferredLocale(locale: Locale): Promise<boolean> {
  const response = await fetch("/api/account/locale", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLocale: locale }),
  })
  if (response.ok) {
    mirrorLocaleStorageKeys(locale)
  }
  return response.ok
}
