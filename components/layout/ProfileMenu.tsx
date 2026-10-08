"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"

import { AdminProfileMenu } from "@/components/layout/AdminProfileMenu"
import { ClientProfileMenu } from "@/components/layout/ClientProfileMenu"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isSignedIn, subscribeToSession } from "@/lib/session"

export function ProfileMenu() {
  const { t } = useLanguage()
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const { role, loading: orgLoading } = useActiveOrganization()
  const sessionLoading = authLoading || orgLoading
  const mockSignedIn = useSyncExternalStore(subscribeToSession, isSignedIn, () => true)
  const signedIn = configured ? isAuthenticated : mockSignedIn
  const menuReady = signedIn && !sessionLoading

  if (!authLoading && !signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        {t("loginSubmit")}
      </Link>
    )
  }

  if (role === "censio_admin") {
    return <AdminProfileMenu menuReady={menuReady} sessionLoading={sessionLoading} />
  }

  return <ClientProfileMenu menuReady={menuReady} sessionLoading={sessionLoading} />
}
