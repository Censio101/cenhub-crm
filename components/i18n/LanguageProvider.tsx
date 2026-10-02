"use client"

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { translate, type MessageKey } from "@/lib/i18n"
import { readStoredLocale, writeStoredLocale } from "@/lib/i18n/stored-locale"
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/types"

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const localeListeners = new Set<() => void>()

function subscribeToLocale(listener: () => void) {
  localeListeners.add(listener)
  // `storage` fires when another tab changes the stored locale.
  window.addEventListener("storage", listener)
  return () => {
    localeListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

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
  // The server and the first client render use "da" (matches SSR); the stored/profile locale
  // is read right after hydration. Changes in this tab and in other tabs both notify us.
  const locale = useSyncExternalStore(
    subscribeToLocale,
    () => readStoredLocale(storageKey),
    (): Locale => "da"
  )

  const setLocale = useCallback(
    (next: Locale) => {
      writeStoredLocale(storageKey, next)
      for (const listener of localeListeners) listener()
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
