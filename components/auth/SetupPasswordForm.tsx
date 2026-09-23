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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
  const [destination, setDestination] = useState("/")

  useEffect(() => {
    if (!loading && configured && !isAuthenticated) {
      router.replace("/login?error=invite_session")
    }
  }, [configured, isAuthenticated, loading, router])

  useEffect(() => {
    if (!isAuthenticated) return

    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return
        setDestination(data.role === "censio_admin" ? "/admin" : "/")
      })
      .catch(() => {
        setDestination("/")
      })
  }, [isAuthenticated])

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
    const { error: updateError } = await supabase.auth.updateUser({ password })

    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.replace(destination)
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg justify-center py-10">
        <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/70" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("brand")}
          </p>
          <CardTitle className="mt-1 text-lg">{t("setupPasswordTitle")}</CardTitle>
          <CardDescription>{t("setupPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("newPasswordLabel")}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("confirmPasswordLabel")}</span>
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
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-11 rounded-[5px]" disabled={submitting}>
              {submitting ? t("setupPasswordSubmitting") : t("setupPasswordSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
