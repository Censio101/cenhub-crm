"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function InviteAcceptForm() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email")?.trim().toLowerCase() ?? ""
  const [email, setEmail] = useState(emailParam)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const dismissError = useCallback(() => setError(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  useAutoDismiss(error, dismissError, 8000)
  useAutoDismiss(notice, dismissNotice)

  useEffect(() => {
    if (emailParam) setEmail(emailParam)
  }, [emailParam])

  async function handleAccept() {
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail) {
      setError(t("inviteAcceptEmailRequired"))
      return
    }

    setSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/auth/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      })
      const data = (await response.json()) as {
        error?: string
        url?: string
        alreadyActive?: boolean
        redirectUrl?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? t("inviteAcceptError"))
      }

      if (data.alreadyActive && data.redirectUrl) {
        setNotice(t("inviteAcceptAlreadyActive"))
        window.setTimeout(() => {
          window.location.href = data.redirectUrl!
        }, 1200)
        return
      }

      if (!data.url) {
        throw new Error(t("inviteAcceptError"))
      }

      window.location.href = data.url
    } catch (acceptError) {
      setError(
        acceptError instanceof Error ? acceptError.message : t("inviteAcceptError")
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("brand")}
          </p>
          <CardTitle className="mt-1 text-lg">{t("inviteAcceptTitle")}</CardTitle>
          <CardDescription>{t("inviteAcceptDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {notice}
            </p>
          ) : null}

          <Button
            type="button"
            className="h-11 rounded-[5px]"
            disabled={submitting}
            onClick={() => void handleAccept()}
          >
            {submitting ? t("inviteAcceptSubmitting") : t("inviteAcceptButton")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("inviteAcceptLoginHint")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("loginSubmit")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
