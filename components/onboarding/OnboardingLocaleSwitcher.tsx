"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { LOCALES, type Locale } from "@/lib/i18n/types"
import { cn } from "cn"

const SHORT_LABEL: Record<Locale, string> = {
  da: "DA",
  en: "EN",
}

export function OnboardingLocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#d3c3b2] bg-white p-0.5 shadow-[0_1px_2px_rgba(26,18,8,0.04)]",
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
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={active}
            onClick={() => setLocale(option.value)}
          >
            {SHORT_LABEL[option.value]}
          </button>
        )
      })}
    </div>
  )
}
