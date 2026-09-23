"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
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

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dismissMessage = useCallback(() => setMessage(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(message, dismissMessage)
  useAutoDismiss(error, dismissError, 6000)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    const callbackError = searchParams.get("error")
    if (callbackError === "auth_callback") {
      setError(t("loginCallbackError"))
    } else if (callbackError === "missing_code") {
      setError(t("loginInvalidLink"))
    }
  }, [searchParams, t])

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault()
    if (!configured) return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("email logins are disabled")
          ? t("loginEmailDisabled")
          : t("loginWrongCredentials")
      )
      return
    }

    router.replace("/")
  }

  async function handleMagicLink() {
    if (!configured || !email.trim()) {
      setError(t("loginEmailRequired"))
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), type: "magiclink" }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("loginMagicLinkError"))

      setMessage(t("loginMagicLinkSent"))
    } catch (magicLinkError) {
      setError(
        magicLinkError instanceof Error ? magicLinkError.message : t("loginMagicLinkError")
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    if (!configured || !email.trim()) {
      setError(t("loginEmailRequired"))
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), type: "recovery" }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("loginResetError"))

      setMessage(t("loginResetSent"))
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("loginResetError"))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isBrowserSupabaseConfigured()) {
    return (
      <div className="mx-auto flex max-w-lg justify-center py-10">
        <Card className="w-full">
          <CardHeader>
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
              {t("loginTitle")}
            </p>
            <CardTitle className="mt-1 text-lg">{t("loginSupabaseMissingTitle")}</CardTitle>
            <CardDescription>{t("loginSupabaseMissingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/" />} className="h-10">
              {t("loginGoToDashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("loginTitle")}
          </p>
          <CardTitle className="mt-1 text-lg">{t("loginHeading")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handlePasswordLogin}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("email")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                placeholder={t("loginEmailPlaceholder")}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="text-sm text-muted-foreground" role="status">
                {message}
              </p>
            ) : null}

            <Button type="submit" className="h-10" disabled={submitting || loading}>
              {submitting ? t("loginSubmitting") : t("loginSubmit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={submitting || loading}
              onClick={() => {
                void handleMagicLink()
              }}
            >
              {t("loginSendMagicLink")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-muted-foreground"
              disabled={submitting || loading}
              onClick={() => {
                void handleForgotPassword()
              }}
            >
              {t("loginForgotPassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
