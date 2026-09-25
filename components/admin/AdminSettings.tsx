"use client"

import { useCallback, useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { persistAdminPreferredLocale } from "@/components/i18n/LocaleSync"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { Button } from "@/components/ui/button"
import { LOCALES, type Locale } from "@/lib/i18n/types"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-ring"

export function AdminSettings() {
  const { locale, setLocale, t } = useLanguage()
  const [draftLocale, setDraftLocale] = useState<Locale>(locale)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  useAutoDismiss(notice, dismissNotice)

  useEffect(() => {
    setDraftLocale(locale)
  }, [locale])

  const hasUnsavedChanges = draftLocale !== locale

  async function handleSave() {
    if (!hasUnsavedChanges || saving) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const ok = await persistAdminPreferredLocale(draftLocale)
      if (!ok) {
        setError(t("settingsSaveFailed"))
        return
      }
      setLocale(draftLocale)
      setNotice(t("settingsSaved"))
    } catch {
      setError(t("settingsSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("brand")}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            {t("settingsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("settingsDescription")}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("settingsLanguageTitle")}</CardTitle>
          <CardDescription>{t("settingsLanguageDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid max-w-xs gap-1.5 text-sm">
            <span className="font-medium">{t("settingsLanguageTitle")}</span>
            <select
              className={fieldClass}
              value={draftLocale}
              disabled={saving}
              onChange={(event) => setDraftLocale(event.target.value as Locale)}
            >
              {LOCALES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            {LOCALES.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  draftLocale === option.value
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setDraftLocale(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="h-10 px-4"
              disabled={!hasUnsavedChanges || saving}
              onClick={() => {
                void handleSave()
              }}
            >
              {saving ? t("settingsSaving") : t("settingsSaveLanguage")}
            </Button>
            {hasUnsavedChanges ? (
              <p className="text-sm text-muted-foreground">{t("settingsUnsavedLanguage")}</p>
            ) : null}
          </div>

          {notice ? (
            <p className="text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
