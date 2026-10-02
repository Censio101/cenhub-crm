export type Locale = "da" | "en"

export const LOCALES: { value: Locale; labelKey: "languageDanish" | "languageEnglish" }[] = [
  { value: "da", labelKey: "languageDanish" },
  { value: "en", labelKey: "languageEnglish" },
]

/** Client dashboard and org-user UI */
export const LOCALE_STORAGE_KEY = "censio-locale"

/** Admin panel only — separate from client dashboard language in localStorage */
export const ADMIN_LOCALE_STORAGE_KEY = "censio-admin-locale"

/** Public signup form at /tilmelding only — independent from admin language */
export const ONBOARDING_LOCALE_STORAGE_KEY = "censio-onboarding-locale"
