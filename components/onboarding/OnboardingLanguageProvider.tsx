"use client"

import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { ONBOARDING_LOCALE_STORAGE_KEY } from "@/lib/i18n/types"
import type { ReactNode } from "react"

/** Locale for the public signup form; does not change admin app language. */
export function OnboardingLanguageProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider storageKey={ONBOARDING_LOCALE_STORAGE_KEY} restoreDocumentLangOnUnmount>
      {children}
    </LanguageProvider>
  )
}
