"use client"

import { useEffect, useState } from "react"

import { OnboardingApplicationForm } from "@/components/onboarding/OnboardingApplicationForm"
import { OnboardingApplicationSuccess } from "@/components/onboarding/OnboardingApplicationSuccess"
import { OnboardingLocaleSwitcher } from "@/components/onboarding/OnboardingLocaleSwitcher"
import { useLanguage } from "@/components/i18n/LanguageProvider"

function TilmeldingPageHeader({ submitted }: { submitted: boolean }) {
  const { t } = useLanguage()

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("onboardingPublicBrand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          {submitted ? t("onboardingSuccessTitle") : t("onboardingPublicPageTitle")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {submitted ? t("onboardingSuccessBody") : t("onboardingPublicPageDescription")}
        </p>
      </div>
      <OnboardingLocaleSwitcher className="shrink-0 self-start" />
    </header>
  )
}

export function TilmeldingPageClient() {
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!submitted) return
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [submitted])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-4">
      <TilmeldingPageHeader submitted={submitted} />

      {submitted ? (
        <OnboardingApplicationSuccess compact />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#d3c3b2] bg-white shadow-[0_2px_12px_rgba(26,18,8,0.06)]">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <OnboardingApplicationForm
              mode="public"
              onSubmitted={() => {
                setSubmitted(true)
              }}
            />
          </div>
        </section>
      )}
    </div>
  )
}
