"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"
import { FormNotice } from "@/components/ui/form-notice"
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

function safeLoginNextPath(raw: string | null): string {
  const next = raw?.trim() || "/"
  if (!next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loginProgress, setLoginProgress] = useState<
    null | "signIn" | "session" | "redirect"
  >(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loginBusy = submitting || loginProgress !== null

  const dismissMessage = useCallback(() => setMessage(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(message, dismissMessage)
  useAutoDismiss(error, dismissError, 6000)

  // Already signed in (e.g. bookmarked /login): redirect without blocking on /api/auth/me.
  useEffect(() => {
    if (loading || !isAuthenticated || loginProgress !== null) return
    const next = safeLoginNextPath(searchParams.get("next"))
    // #region agent log
    fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
      body: JSON.stringify({
        sessionId: "138f58",
        runId: "post-fix",
        hypothesisId: "H2",
        location: "LoginForm.tsx:useEffect",
        message: "session_redirect",
        data: { next },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    router.replace(next)
    router.refresh()
  }, [isAuthenticated, loading, loginProgress, router, searchParams])

  // Notices arrive as `?error=` / `?message=` after auth redirects. Each one is shown once
  // (adjusted while rendering), then the query is removed from the address bar.
  const callbackError = searchParams.get("error")
  const successMessage = searchParams.get("message")
  const queryNoticeKey = `${callbackError ?? ""}|${successMessage ?? ""}`
  const [shownNoticeKey, setShownNoticeKey] = useState("|")
  if (queryNoticeKey !== "|" && queryNoticeKey !== shownNoticeKey) {
    setShownNoticeKey(queryNoticeKey)
    if (successMessage === "account_ready") {
      setMessage(t("loginAccountReady"))
      setError(null)
    } else if (callbackError === "auth_callback" || callbackError === "access_denied") {
      setError(t("loginCallbackError"))
    } else if (callbackError === "otp_expired") {
      setError(t("loginInviteExpired"))
    } else if (callbackError === "missing_code") {
      setError(t("loginInvalidLink"))
    } else if (callbackError === "invite_session") {
      setError(t("loginInviteSessionError"))
    }
  }

  useEffect(() => {
    if (!callbackError && !successMessage) return
    window.history.replaceState(null, "", "/login")
  }, [callbackError, successMessage])

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault()
    if (!configured || loginBusy) return

    setSubmitting(true)
    setLoginProgress("signIn")
    setError(null)
    setMessage(null)

    const supabase = createClient()

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(
          signInError.message.toLowerCase().includes("email logins are disabled")
            ? t("loginEmailDisabled")
            : t("loginWrongCredentials")
        )
        setSubmitting(false)
        setLoginProgress(null)
        return
      }

      setLoginProgress("session")
      // Invited users who already chose a password (legacy accounts) may lack this flag in the JWT.
      await supabase.auth.updateUser({ data: { password_setup_complete: true } })
      await supabase.auth.refreshSession()
      // #region agent log
      fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
        body: JSON.stringify({
          sessionId: "138f58",
          hypothesisId: "H4",
          location: "LoginForm.tsx:handlePasswordLogin",
          message: "after_refresh_session",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion

      const next = safeLoginNextPath(searchParams.get("next"))
      setLoginProgress("redirect")
      // #region agent log
      fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
        body: JSON.stringify({
          sessionId: "138f58",
          runId: "post-fix",
          hypothesisId: "H1",
          location: "LoginForm.tsx:handlePasswordLogin",
          message: "password_login_redirect",
          data: { next },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      router.replace(next)
      router.refresh()
      setLoginProgress(null)
      setSubmitting(false)
    } catch {
      setError(t("loginWrongCredentials"))
      setSubmitting(false)
      setLoginProgress(null)
    }
  }

  const loginProgressMessage =
    loginProgress === "signIn"
      ? t("loginSubmitting")
      : loginProgress === "session"
        ? t("loginPreparingSession")
        : loginProgress === "redirect"
          ? t("loginRedirecting")
          : null

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
        <Card className="dashboard-card w-full">
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
    )
  }

  return (
      <Card className="dashboard-card w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-medium sm:text-2xl">{t("loginHeading")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handlePasswordLogin}>
            <label className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:delay-75 grid gap-2 text-sm">
              <span className="font-medium text-muted-foreground">{t("email")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                placeholder={t("loginEmailPlaceholder")}
                disabled={loginBusy || loading}
              />
            </label>
            <label className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:delay-150 grid gap-2 text-sm">
              <span className="font-medium text-muted-foreground">{t("password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
                disabled={loginBusy || loading}
              />
            </label>

            {error ? (
              <FormNotice message={error} tone="error" onDismiss={dismissError} />
            ) : null}
            {message ? (
              <FormNotice message={message} tone="success" onDismiss={dismissMessage} />
            ) : null}

            {loginProgressMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 rounded-[15px] border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground"
              >
                <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                <span>{loginProgressMessage}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:delay-200 h-11 rounded-[5px]"
              disabled={loginBusy || loading}
            >
              {loginBusy ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  {loginProgressMessage ?? t("loginSubmitting")}
                </>
              ) : (
                t("loginSubmit")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loginBusy || loading}
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
              disabled={loginBusy || loading}
              onClick={() => {
                void handleForgotPassword()
              }}
            >
              {t("loginForgotPassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
  )
}
