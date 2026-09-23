"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"

import {
  getMatchingPasswordState,
  MatchingPasswordFields,
} from "@/components/auth/MatchingPasswordFields"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { FormNotice } from "@/components/ui/form-notice"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SetupPasswordForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dismissError = useCallback(() => setError(null), [])
  const { isValid } = getMatchingPasswordState(password, confirmPassword)

  useEffect(() => {
    if (loading || !configured) return

    if (!isAuthenticated) {
      const timeout = window.setTimeout(() => {
        router.replace("/login?error=invite_session")
      }, 1500)
      return () => window.clearTimeout(timeout)
    }
  }, [configured, isAuthenticated, loading, router])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!isValid) {
      if (password.length < 8) {
        setError(t("passwordTooShort"))
      } else {
        setError(t("passwordMismatch"))
      }
      return
    }

    if (!configured || !isBrowserSupabaseConfigured()) {
      setError(t("adminPasswordUnavailable"))
      return
    }

    setSubmitting(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { password_setup_complete: true },
    })

    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }

    await supabase.auth.signOut()
    router.replace("/login?message=account_ready")
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-xl justify-center py-10 sm:py-14">
        <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/70" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl justify-center py-10 sm:py-14">
      <Card className="dashboard-card w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-medium sm:text-2xl">
            {t("setupPasswordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            {error ? (
              <FormNotice message={error} tone="error" onDismiss={dismissError} />
            ) : null}

            <MatchingPasswordFields
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              disabled={submitting}
            />

            <Button
              type="submit"
              className="h-11 w-full rounded-[5px] sm:w-auto sm:min-w-48"
              disabled={submitting || !isValid}
            >
              {submitting ? t("setupPasswordSubmitting") : t("setupPasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
