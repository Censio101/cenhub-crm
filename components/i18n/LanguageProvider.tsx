"use client"

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { isLocale, translate, type MessageKey } from "@/lib/i18n"
import { readStoredLocale, writeStoredLocale } from "@/lib/i18n/stored-locale"
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/types"

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function LanguageHtmlSync({
  locale,
  restoreDocumentLangOnUnmount,
}: {
  locale: Locale
  restoreDocumentLangOnUnmount?: boolean
}) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale
    if (!restoreDocumentLangOnUnmount) return
    return () => {
      document.documentElement.lang = readStoredLocale(LOCALE_STORAGE_KEY)
    }
  }, [locale, restoreDocumentLangOnUnmount])
  return null
}

type LanguageProviderProps = {
  children: ReactNode
  storageKey?: string
  restoreDocumentLangOnUnmount?: boolean
}

export function LanguageProvider({
  children,
  storageKey = LOCALE_STORAGE_KEY,
  restoreDocumentLangOnUnmount = false,
}: LanguageProviderProps) {
  // Match SSR first paint (da), then hydrate stored/profile locale in layout effect.
  const [locale, setLocaleState] = useState<Locale>("da")

  useLayoutEffect(() => {
    setLocaleState(readStoredLocale(storageKey))
  }, [storageKey])

  useLayoutEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      if (event.newValue && isLocale(event.newValue)) {
        setLocaleState(event.newValue)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey])

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      writeStoredLocale(storageKey, next)
    },
    [storageKey]
  )

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      <LanguageHtmlSync
        locale={locale}
        restoreDocumentLangOnUnmount={restoreDocumentLangOnUnmount}
      />
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
