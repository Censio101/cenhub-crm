export type Locale = "da" | "en"

export const LOCALES: { value: Locale; labelKey: "languageDanish" | "languageEnglish" }[] = [
  { value: "da", labelKey: "languageDanish" },
  { value: "en", labelKey: "languageEnglish" },
]

/** Admin / signed-in app UI (settings, sidebar, etc.) */
export const LOCALE_STORAGE_KEY = "censio-locale"

/** Public signup form at /tilmelding only — independent from admin language */
export const ONBOARDING_LOCALE_STORAGE_KEY = "censio-onboarding-locale"
