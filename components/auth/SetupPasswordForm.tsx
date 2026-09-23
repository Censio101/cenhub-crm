"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

export function SetupPasswordForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (password.length < 8) {
      setError(t("passwordTooShort"))
      return
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"))
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
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-muted-foreground">{t("newPasswordLabel")}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-muted-foreground">
                {t("confirmPasswordLabel")}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={fieldClass}
              />
            </label>

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-[5px] sm:w-auto sm:min-w-48"
              disabled={submitting}
            >
              {submitting ? t("setupPasswordSubmitting") : t("setupPasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
