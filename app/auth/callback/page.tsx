"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client"

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function completeAuth() {
      if (!isBrowserSupabaseConfigured()) {
        router.replace("/login?error=auth_callback")
        return
      }

      const next = searchParams.get("next") ?? "/auth/setup-password"
      const queryError = searchParams.get("error")
      const queryErrorCode = searchParams.get("error_code")
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const hashError = hashParams.get("error")
      const hashErrorCode = hashParams.get("error_code")

      if (queryError || queryErrorCode || hashError || hashErrorCode) {
        router.replace(
          `/login?error=${encodeURIComponent(hashErrorCode ?? queryErrorCode ?? hashError ?? queryError ?? "auth_callback")}`
        )
        return
      }

      setMessage(t("authCallbackWorking"))

      const supabase = createClient()
      const code = searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (error) {
          router.replace("/login?error=auth_callback")
          return
        }
        router.replace(next)
        return
      }

      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!active) return
        if (error) {
          router.replace("/login?error=auth_callback")
          return
        }
        router.replace(next)
        return
      }

      router.replace("/login?error=missing_code")
    }

    void completeAuth()

    return () => {
      active = false
    }
  }, [router, searchParams, t])

  return (
    <div className="mx-auto flex w-full max-w-lg justify-center py-14">
      <div className="w-full rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">
          {message ?? t("authCallbackWorking")}
        </p>
      </div>
    </div>
  )
}

function AuthCallbackFallback() {
  return (
    <div className="mx-auto flex w-full max-w-lg justify-center py-14">
      <div className="h-32 w-full animate-pulse rounded-2xl bg-muted/70" />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
