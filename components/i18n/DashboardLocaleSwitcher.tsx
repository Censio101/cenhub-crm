"use client"

import { useCallback } from "react"

import {
  persistAccountPreferredLocale,
  persistAdminPreferredLocale,
} from "@/components/i18n/LocaleSync"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { LOCALES, type Locale } from "@/lib/i18n/types"
import { cn } from "cn"

const SHORT_LABEL: Record<Locale, string> = {
  da: "DA",
  en: "EN",
}

export function DashboardLocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage()
  const { role } = useActiveOrganization()

  const handleChange = useCallback(
    (next: Locale) => {
      if (next === locale) return
      const previous = locale
      setLocale(next)
      void (async () => {
        const persist =
          role === "censio_admin" ? persistAdminPreferredLocale : persistAccountPreferredLocale
        const ok = await persist(next)
        if (!ok) setLocale(previous)
      })()
    },
    [locale, role, setLocale]
  )

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/25 bg-white/10 p-0.5",
        className
      )}
      role="group"
      aria-label={t("settingsLanguageTitle")}
    >
      {LOCALES.map((option) => {
        const active = locale === option.value
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-white text-[#0a0a0a]"
                : "text-white/75 hover:text-white"
            )}
            aria-pressed={active}
            onClick={() => handleChange(option.value)}
          >
            {SHORT_LABEL[option.value]}
          </button>
        )
      })}
    </div>
  )
}
