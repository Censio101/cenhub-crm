"use client"

import { useEffect, useRef } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isLocale } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"

/** Sync locale from role + admin profile; lock client users to Danish. */
export function LocaleSync() {
  const { setLocale } = useLanguage()
  const { role, loading: orgLoading } = useActiveOrganization()
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const syncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!configured || authLoading || orgLoading) return

    if (!isAuthenticated) {
      syncedRef.current = null
      return
    }

    const syncKey = `${role ?? "none"}`
    if (syncedRef.current === syncKey) return

    if (role && role !== "censio_admin") {
      setLocale("da")
      syncedRef.current = syncKey
      return
    }

    if (role === "censio_admin") {
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
    }
  }, [
    authLoading,
    configured,
    isAuthenticated,
    orgLoading,
    role,
    setLocale,
  ])

  return null
}

export async function persistAdminPreferredLocale(locale: Locale) {
  await fetch("/api/admin/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLocale: locale }),
  })
}
