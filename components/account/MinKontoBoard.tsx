"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  BuildingIcon,
  CheckIcon,
  GlobeIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { ProfileAvatarUpload } from "@/components/account/ProfileAvatarUpload"
import {
  getMatchingPasswordState,
  hasSpecialCharacter,
  MatchingPasswordFields,
  RequirementRow,
} from "@/components/auth/MatchingPasswordFields"
import { persistAccountPreferredLocale } from "@/components/i18n/LocaleSync"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useSession } from "@/components/session/SessionProvider"
import { Button } from "@/components/ui/button"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client"
import { LOCALES, type Locale } from "@/lib/i18n/types"
import { useSyncedState } from "@/lib/react/use-keyed-state"
import { cn } from "cn"

type KontoTab = "profile" | "password" | "language"

const fieldClass =
  "h-11 w-full rounded-xl border border-[#e8e0d8] bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-[#d3c3b2] focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
    >
      {tone === "success" ? <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  )
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-7 border-b border-[#efe6dd] pb-5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

export function MinKontoBoard() {
  const { t, locale, setLocale } = useLanguage()
  const { user, role, organization, reload } = useSession()
  const { configured, user: authUser } = useSupabaseSession()

  const [tab, setTab] = useState<KontoTab>("profile")

  const [displayName, setDisplayName] = useSyncedState(user?.fullName?.trim() ?? "")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameNotice, setNameNotice] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const [profileImage, setProfileImage] = useSyncedState(user?.avatarUrl?.trim() ?? "")
  const [photoNotice, setPhotoNotice] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  const [localeSavingTo, setLocaleSavingTo] = useState<Locale | null>(null)
  const [localeNotice, setLocaleNotice] = useState<string | null>(null)
  const [localeError, setLocaleError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const dismissPhotoNotice = useCallback(() => setPhotoNotice(null), [])
  const dismissPhotoError = useCallback(() => setPhotoError(null), [])
  const dismissNameNotice = useCallback(() => setNameNotice(null), [])
  const dismissLocaleNotice = useCallback(() => setLocaleNotice(null), [])

  useAutoDismiss(photoNotice, dismissPhotoNotice)
  useAutoDismiss(photoError, dismissPhotoError, 6000)
  useAutoDismiss(nameNotice, dismissNameNotice)
  useAutoDismiss(localeNotice, dismissLocaleNotice)

  useEffect(() => {
    if (user?.fullName != null) setDisplayName(user.fullName.trim())
  }, [user?.fullName, setDisplayName])

  useEffect(() => {
    if (user?.avatarUrl != null) setProfileImage(user.avatarUrl.trim())
  }, [user?.avatarUrl, setProfileImage])

  const loginEmail = user?.email ?? authUser?.email ?? ""
  const heroName = displayName.trim() || user?.fullName?.trim() || loginEmail.split("@")[0] || ""
  const initials = clientInitialsFromName(heroName || "?")
  const organizationLabel = organization ? formatClientDisplayName(organization.name) : null
  const roleLabel =
    role === "client_admin"
      ? t("roleClientAdmin")
      : role === "client_user"
        ? t("roleClientUser")
        : null
  const nameChanged = displayName.trim() !== (user?.fullName?.trim() ?? "")
  const passwordRules = getMatchingPasswordState(newPassword, confirmPassword)
  const passwordHasSpecial = hasSpecialCharacter(newPassword)

  async function saveProfilePatch(body: { fullName?: string; avatarUrl?: string | null }) {
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) throw new Error(data.error ?? t("settingsSaveFailed"))
    await reload({ silent: true })
  }

  async function saveProfilePhoto(dataUrl: string | null) {
    const previousImage = profileImage
    setPhotoSaving(true)
    setPhotoNotice(null)
    setPhotoError(null)
    setProfileImage(dataUrl ?? "")
    try {
      await saveProfilePatch({ avatarUrl: dataUrl ?? "" })
      setPhotoNotice(dataUrl ? t("profilePhotoSaved") : t("profilePhotoRemoved"))
    } catch (saveError) {
      setProfileImage(previousImage)
      setPhotoError(saveError instanceof Error ? saveError.message : t("profilePhotoSaveError"))
    } finally {
      setPhotoSaving(false)
    }
  }

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault()
    const next = displayName.trim()
    if (!next) return
    setNameSaving(true)
    setNameError(null)
    setNameNotice(null)
    try {
      await saveProfilePatch({ fullName: next })
      setNameNotice(t("nameUpdated"))
    } catch (caught) {
      setNameError(caught instanceof Error ? caught.message : t("settingsSaveFailed"))
    } finally {
      setNameSaving(false)
    }
  }

  async function handleSelectLocale(next: Locale) {
    if (next === locale || localeSavingTo) return
    setLocaleSavingTo(next)
    setLocaleError(null)
    setLocaleNotice(null)
    try {
      const ok = await persistAccountPreferredLocale(next)
      if (!ok) {
        setLocaleError(t("settingsSaveFailed"))
        return
      }
      setLocale(next)
      setLocaleNotice(t("settingsSaved"))
    } catch {
      setLocaleError(t("settingsSaveFailed"))
    } finally {
      setLocaleSavingTo(null)
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault()
    setPasswordNotice(null)
    setPasswordError(null)
    if (!currentPassword) return setPasswordError(t("passwordCurrentRequired"))
    if (newPassword.length < 8) return setPasswordError(t("passwordTooShort"))
    if (!hasSpecialCharacter(newPassword)) return setPasswordError(t("passwordNeedsSpecial"))
    if (newPassword !== confirmPassword) return setPasswordError(t("passwordMismatch"))
    if (!configured || !isBrowserSupabaseConfigured() || !loginEmail) {
      return setPasswordError(t("adminPasswordUnavailable"))
    }

    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: currentPassword,
      })
      if (signInError) return setPasswordError(t("passwordCurrentWrong"))

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) return setPasswordError(updateError.message)

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordNotice(t("passwordUpdated"))
    } finally {
      setPasswordSaving(false)
    }
  }

  const tabs: { id: KontoTab; label: string; icon: typeof UserRoundIcon }[] = [
    { id: "profile", label: t("kontoSectionProfileTitle"), icon: UserRoundIcon },
    { id: "password", label: t("password"), icon: KeyRoundIcon },
    { id: "language", label: t("settingsLanguageTitle"), icon: GlobeIcon },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white shadow-[0_2px_10px_rgba(26,18,8,0.05)]">
        <div className="h-24 bg-[linear-gradient(120deg,#2a1608_0%,#833b08_55%,#e4660c_130%)] sm:h-28" />
        <div className="flex flex-col items-center gap-4 px-5 pb-6 text-center sm:flex-row sm:items-end sm:gap-6 sm:px-8 sm:text-left">
          <ProfileAvatarUpload
            className="-mt-14 shrink-0 sm:-mt-16"
            image={profileImage}
            initials={initials}
            saving={photoSaving}
            onImageChange={(dataUrl) => void saveProfilePhoto(dataUrl)}
            onRemove={profileImage ? () => void saveProfilePhoto(null) : undefined}
            onError={(message) => setPhotoError(message)}
          />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
              {heroName || t("minAccount")}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{loginEmail}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {roleLabel ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
                  {roleLabel}
                </span>
              ) : null}
              {organizationLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf8f6] px-2.5 py-1 text-[12px] font-medium text-foreground ring-1 ring-[#e8e0d8]">
                  <BuildingIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {organizationLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {photoNotice || photoError ? (
          <div className="px-5 pb-5 sm:px-8">
            {photoError ? <Notice tone="error">{photoError}</Notice> : null}
            {photoNotice ? <Notice tone="success">{photoNotice}</Notice> : null}
          </div>
        ) : null}
      </section>

      {/* Settings shell: tinted sidebar + white content */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white shadow-[0_2px_10px_rgba(26,18,8,0.05)] md:grid md:grid-cols-[14.5rem_minmax(0,1fr)]">
        <nav
          aria-label={t("minAccount")}
          className={cn(
            "flex gap-1.5 overflow-x-auto border-b border-[#e8e0d8] bg-[#faf8f6] p-2.5",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:flex-col md:overflow-visible md:border-r md:border-b-0 md:p-4"
          )}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors",
                tab === id
                  ? "bg-white text-primary shadow-sm ring-1 ring-[#e8e0d8]"
                  : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", tab === id && "text-primary")} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div
          key={tab}
          className="min-w-0 p-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 sm:p-8 md:min-h-[26rem]"
        >
          {tab === "profile" ? (
            <section>
              <PanelHeading
                title={t("kontoSectionProfileTitle")}
                description={t("kontoSectionProfileDescription")}
              />
              <form className="grid gap-6" onSubmit={(event) => void handleSaveName(event)}>
                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="grid content-start gap-1.5">
                    <span className="text-[13px] font-semibold text-foreground">
                      {t("profileNameLabel")}
                    </span>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value)
                        setNameNotice(null)
                      }}
                      placeholder={t("profileNamePlaceholder")}
                      className={fieldClass}
                      disabled={nameSaving}
                    />
                  </label>

                  <label className="grid content-start gap-1.5">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      {t("emailLabel")}
                      <LockIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <input
                      type="email"
                      readOnly
                      value={loginEmail}
                      className={cn(fieldClass, "cursor-not-allowed bg-[#faf8f6] text-muted-foreground")}
                    />
                    <span className="text-[12px] leading-relaxed text-muted-foreground">
                      {t("kontoLoginEmailHint")}
                    </span>
                  </label>
                </div>

                {nameError ? <Notice tone="error">{nameError}</Notice> : null}
                {nameNotice ? <Notice tone="success">{nameNotice}</Notice> : null}

                <div className="flex items-center justify-end border-t border-[#efe6dd] pt-5">
                  <Button
                    type="submit"
                    className="h-10 gap-2 px-5"
                    disabled={nameSaving || !displayName.trim() || !nameChanged}
                  >
                    {nameSaving ? (
                      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {nameSaving ? t("cropPhotoSaving") : t("saveName")}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          {tab === "password" ? (
            <section>
              <PanelHeading
                title={t("changePasswordTitle")}
                description={t("changePasswordDescription")}
              />
              <form
                className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-8"
                onSubmit={(event) => void handleChangePassword(event)}
              >
                <div className="grid gap-5">
                  <label className="grid gap-1.5">
                    <span className="text-[13px] font-semibold text-foreground">
                      {t("currentPasswordLabel")}
                    </span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className={fieldClass}
                      disabled={passwordSaving}
                    />
                  </label>

                  <MatchingPasswordFields
                    password={newPassword}
                    confirmPassword={confirmPassword}
                    onPasswordChange={setNewPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    disabled={passwordSaving}
                    showRequirements={false}
                    layout="split"
                    fieldClassName={fieldClass}
                  />

                  {passwordError ? <Notice tone="error">{passwordError}</Notice> : null}
                  {passwordNotice ? <Notice tone="success">{passwordNotice}</Notice> : null}

                  <div className="flex items-center justify-end border-t border-[#efe6dd] pt-5">
                    <Button type="submit" className="h-10 gap-2 px-5" disabled={passwordSaving}>
                      {passwordSaving ? (
                        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      {passwordSaving ? t("cropPhotoSaving") : t("savePassword")}
                    </Button>
                  </div>
                </div>

                <aside className="rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
                    {t("kontoPasswordRequirementsTitle")}
                  </p>
                  <ul className="mt-3 grid gap-2">
                    <RequirementRow
                      met={passwordRules.hasMinLength}
                      label={t("passwordRequirementLength")}
                    />
                    <RequirementRow
                      met={passwordHasSpecial}
                      label={t("passwordRequirementSpecial")}
                    />
                    <RequirementRow
                      met={passwordRules.passwordsMatch}
                      label={t("passwordRequirementMatch")}
                      tone={passwordRules.showMismatch ? "error" : "neutral"}
                    />
                  </ul>
                </aside>
              </form>
            </section>
          ) : null}

          {tab === "language" ? (
            <section>
              <PanelHeading
                title={t("settingsLanguageTitle")}
                description={t("kontoLanguageLead")}
              />
              <div
                className="grid gap-4 sm:grid-cols-2"
                role="radiogroup"
                aria-label={t("settingsLanguageTitle")}
              >
                {LOCALES.map((option) => {
                  const selected = option.value === locale
                  const saving = localeSavingTo === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={localeSavingTo !== null}
                      onClick={() => void handleSelectLocale(option.value)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                          : "border-[#e8e0d8] bg-white hover:border-primary/40 hover:bg-[#faf8f6]",
                        "disabled:cursor-wait disabled:opacity-70"
                      )}
                    >
                      <span className="flex items-center gap-3.5">
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl text-xs font-bold uppercase",
                            selected ? "bg-primary text-white" : "bg-[#faf8f6] text-muted-foreground"
                          )}
                        >
                          {option.value}
                        </span>
                        <span className="text-base font-medium text-foreground">
                          {t(option.labelKey)}
                        </span>
                      </span>
                      {saving ? (
                        <Loader2Icon className="size-4 animate-spin text-primary" aria-hidden="true" />
                      ) : selected ? (
                        <CheckIcon className="size-5 text-primary" aria-hidden="true" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <div className="mt-5">
                {localeError ? <Notice tone="error">{localeError}</Notice> : null}
                {localeNotice ? <Notice tone="success">{localeNotice}</Notice> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
