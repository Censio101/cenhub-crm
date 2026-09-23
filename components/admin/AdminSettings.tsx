"use client"

import { useCallback, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { LOCALES, type Locale } from "@/lib/i18n/types"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-ring"

export function AdminSettings() {
  const { locale, setLocale, t } = useLanguage()
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  useAutoDismiss(notice, dismissNotice)

  function handleChange(next: Locale) {
    setLocale(next)
    setNotice(t("settingsSaved"))
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
              value={locale}
              onChange={(event) => handleChange(event.target.value as Locale)}
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
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  locale === option.value
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleChange(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          {notice ? (
            <p className="text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
