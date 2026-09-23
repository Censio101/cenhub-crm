"use client"

import { useEffect, useRef, useState } from "react"
import { UserRoundIcon } from "lucide-react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { useLanguage } from "@/components/i18n/LanguageProvider"
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

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vælg en billedfil."))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Billedet må højst være 2 MB."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Billedet kunne ikke læses."))
    }
    reader.onerror = () => reject(new Error("Billedet kunne ikke læses."))
    reader.readAsDataURL(file)
  })
}

export function MinKontoBoard() {
  const { t } = useLanguage()
  const { settings, updateSettings } = useAccountSettings()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [email, setEmail] = useState(settings.email)
  const [emailSaved, setEmailSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    setEmail(settings.email)
  }, [settings.email])

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        {t("brand")}
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
        {t("minAccount")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("minAccountDescription")}</p>

      <div className="mt-8 grid gap-5">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("profilePhotoTitle")}</CardTitle>
            <CardDescription>{t("profilePhotoDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
                {settings.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.profileImage}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRoundIcon className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (!file) return
                    try {
                      const next = await readImageFile(file)
                      setImageError(null)
                      updateSettings({ profileImage: next })
                    } catch (caught) {
                      setImageError(
                        caught instanceof Error
                          ? caught.message
                          : "Kunne ikke skifte billede."
                      )
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => inputRef.current?.click()}
                >
                  {t("changePhoto")}
                </Button>
                {imageError ? (
                  <p className="mt-2 text-sm text-danger-foreground">{imageError}</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("changeEmailTitle")}</CardTitle>
            <CardDescription>{t("changeEmailDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                const next = email.trim().toLowerCase()
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return
                updateSettings({ email: next })
                setEmailSaved(true)
              }}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("emailLabel")}
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setEmailSaved(false)
                  }}
                  className={fieldClass}
                />
              </label>
              <Button type="submit" className="h-11 rounded-[5px] px-4">
                {t("saveEmail")}
              </Button>
            </form>
            {emailSaved ? (
              <p className="mt-3 text-sm text-success-foreground">{t("emailUpdated")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>{t("changePasswordTitle")}</CardTitle>
            <CardDescription>{t("changePasswordDescription")}</CardDescription>
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
                if (!currentPassword) {
                  setPasswordError(t("passwordCurrentRequired"))
                  return
                }
                setPasswordError(null)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setPasswordMessage(t("passwordUpdated"))
              }}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("currentPasswordLabel")}
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
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
                <Button type="submit">{t("savePassword")}</Button>
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
