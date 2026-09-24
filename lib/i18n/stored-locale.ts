import {
  LOCALE_STORAGE_KEY,
  ONBOARDING_LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/types"

function isLocale(value: string): value is Locale {
  return value === "da" || value === "en"
}

export function readStoredLocale(storageKey: string): Locale {
  if (typeof window === "undefined") return "da"

  const stored = window.localStorage.getItem(storageKey)
  if (stored && isLocale(stored)) return stored

  // First visit to public signup: match admin/app language if already chosen
  if (storageKey === ONBOARDING_LOCALE_STORAGE_KEY) {
    const appLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (appLocale && isLocale(appLocale)) return appLocale
  }

  return "da"
}

export function writeStoredLocale(storageKey: string, locale: Locale): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey, locale)
}
