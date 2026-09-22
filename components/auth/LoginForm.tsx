"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

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
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    const callbackError = searchParams.get("error")
    if (callbackError === "auth_callback") {
      setError("Login-linket kunne ikke bekræftes. Prøv igen.")
    } else if (callbackError === "missing_code") {
      setError("Ugyldigt login-link.")
    }
  }, [searchParams])

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
          ? "E-mail login er deaktiveret i Supabase. Kontakt Censio support."
          : "Forkert e-mail eller adgangskode."
      )
      return
    }

    router.replace("/")
  }

  async function handleMagicLink() {
    if (!configured || !email.trim()) {
      setError("Indtast din e-mail for at modtage et login-link.")
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    setSubmitting(false)

    if (otpError) {
      setError("Kunne ikke sende login-link. Tjek e-mailen og prøv igen.")
      return
    }

    setMessage("Tjek din indbakke — vi har sendt et login-link.")
  }

  if (!isBrowserSupabaseConfigured()) {
    return (
      <div className="mx-auto flex max-w-lg justify-center py-10">
        <Card className="w-full">
          <CardHeader>
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
              Login
            </p>
            <CardTitle className="mt-1 text-lg">Supabase er ikke sat op</CardTitle>
            <CardDescription>
              Tilføj Supabase-miljøvariabler for at aktivere login. Indtil da
              kører CRM&apos;et med demo-data uden rigtig auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/" />} className="h-10">
              Gå til dashboard
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
            Login
          </p>
          <CardTitle className="mt-1 text-lg">Log ind på Censio</CardTitle>
          <CardDescription>
            Adgang er kun for inviterede brugere. Brug den e-mail og adgangskode,
            du har modtaget fra Censio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handlePasswordLogin}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">E-mail</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                placeholder="kontakt@virksomhed.dk"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Adgangskode</span>
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
              {submitting ? "Logger ind…" : "Log ind"}
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
              Send login-link i stedet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
