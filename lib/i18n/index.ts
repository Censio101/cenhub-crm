import { da, type Messages } from "@/lib/i18n/locales/da"
import { en } from "@/lib/i18n/locales/en"
import type { Locale } from "@/lib/i18n/types"

const catalogs: Record<Locale, Messages> = { da, en }

export type MessageKey = keyof Messages

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const template = catalogs[locale][key] ?? catalogs.da[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? "")
  )
}

export function getMessages(locale: Locale): Messages {
  return catalogs[locale]
}

export function isLocale(value: string): value is Locale {
  return value === "da" || value === "en"
}
