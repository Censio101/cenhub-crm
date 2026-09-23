"use client"

import { useEffect, useRef, useState } from "react"

import { ProfilePhotoField } from "@/components/account/ProfilePhotoField"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminAccountSettings } from "@/hooks/useAdminAccountSettings"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import {
  createClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type AuthProfile = {
  email: string | null
  fullName: string | null
}

export function AdminKontoBoard() {
  const { t } = useLanguage()
  const { settings, updateSettings } = useAdminAccountSettings()
  const { user, configured } = useSupabaseSession()
  const [authProfile, setAuthProfile] = useState<AuthProfile>({ email: null, fullName: null })
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [nameSaved, setNameSaved] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const hasSyncedAvatar = useRef(false)

  useEffect(() => {
    if (hasSyncedAvatar.current || !settings.profileImage) return
    hasSyncedAvatar.current = true
    void fetch("/api/admin/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: settings.profileImage }),
    })
  }, [settings.profileImage])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setAuthProfile({
          email: data.email ?? user?.email ?? null,
          fullName: data.fullName ?? null,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setAuthProfile({ email: user?.email ?? null, fullName: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [user?.email])

  useEffect(() => {
    if (settings.displayName) {
      setDisplayName(settings.displayName)
      return
    }
    if (authProfile.fullName) {
      setDisplayName(authProfile.fullName)
    }
  }, [settings.displayName, authProfile.fullName])

  const loginEmail = authProfile.email ?? user?.email ?? ""

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        {t("brand")}
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
        {t("adminAccountTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("adminAccountDescription")}</p>

      <div className="mt-8 grid gap-5">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("profileNameTitle")}</CardTitle>
            <CardDescription>{t("adminProfileNameDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                const next = displayName.trim()
                if (!next) return
                updateSettings({ displayName: next })
                setNameSaved(true)
              }}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("profileNameLabel")}
                </span>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    setNameSaved(false)
                  }}
                  placeholder={t("profileNamePlaceholder")}
                  className={fieldClass}
                />
              </label>
              <Button type="submit" className="h-11 rounded-[5px] px-4">
                {t("saveName")}
              </Button>
            </form>
            {nameSaved ? (
              <p className="mt-3 text-sm text-success-foreground">{t("nameUpdated")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("profilePhotoTitle")}</CardTitle>
            <CardDescription>{t("adminProfilePhotoDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePhotoField
              image={settings.profileImage}
              onImageChange={(dataUrl) => {
                updateSettings({ profileImage: dataUrl })
                void fetch("/api/admin/me/profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ avatarUrl: dataUrl }),
                })
              }}
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("adminLoginEmailTitle")}</CardTitle>
            <CardDescription>{t("adminLoginEmailDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("emailLabel")}
              </span>
              <input
                type="email"
                readOnly
                value={loginEmail}
                className={cn(fieldClass, "bg-[#faf8f6] text-foreground")}
              />
            </label>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("changePasswordTitle")}</CardTitle>
            <CardDescription>{t("adminChangePasswordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                setPasswordMessage(null)
                if (newPassword.length < 8) {
                  setPasswordError(t("passwordTooShort"))
                  return
                }
                if (newPassword !== confirmPassword) {
                  setPasswordError(t("passwordMismatch"))
                  return
                }
                if (!configured || !isBrowserSupabaseConfigured()) {
                  setPasswordError(t("adminPasswordUnavailable"))
                  return
                }
                setPasswordSaving(true)
                setPasswordError(null)
                void createClient()
                  .auth.updateUser({ password: newPassword })
                  .then(({ error }) => {
                    if (error) {
                      setPasswordError(error.message)
                      return
                    }
                    setNewPassword("")
                    setConfirmPassword("")
                    setPasswordMessage(t("passwordUpdated"))
                  })
                  .finally(() => setPasswordSaving(false))
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("newPasswordLabel")}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
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
              </div>
              <div>
                <Button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? t("cropPhotoSaving") : t("savePassword")}
                </Button>
              </div>
            </form>
            {passwordError ? (
              <p className="mt-3 text-sm text-danger-foreground">{passwordError}</p>
            ) : null}
            {passwordMessage ? (
              <p className="mt-3 text-sm text-success-foreground">{passwordMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
