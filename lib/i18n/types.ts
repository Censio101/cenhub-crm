export type Locale = "da" | "en"

export const LOCALES: { value: Locale; labelKey: "languageDanish" | "languageEnglish" }[] = [
  { value: "da", labelKey: "languageDanish" },
  { value: "en", labelKey: "languageEnglish" },
]

export const LOCALE_STORAGE_KEY = "censio-locale"
