"use client"

import type { ReactNode } from "react"

import { OnboardingLanguageProvider } from "@/components/onboarding/OnboardingLanguageProvider"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function TilmeldingPageShell({ children }: { children: ReactNode }) {
  return (
    <OnboardingLanguageProvider>
      <div className={cn(outfit.className)}>{children}</div>
    </OnboardingLanguageProvider>
  )
}
