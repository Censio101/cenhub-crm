"use client"

import { useCallback, useMemo, useState } from "react"
import { CheckIcon, LinkIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { buildPublicSignupUrl } from "@/lib/onboarding/signup-url"

type Props = {
  className?: string
  variant?: "default" | "outline"
}

export function ShareSignupLinkButton({ className, variant = "outline" }: Props) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const signupUrl = useMemo(() => {
    if (typeof window === "undefined") return buildPublicSignupUrl("")
    return buildPublicSignupUrl(window.location.origin)
  }, [])

  const handleCopy = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? buildPublicSignupUrl(window.location.origin)
        : signupUrl
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt(t("onboardingCopySignupLinkPrompt"), url)
    }
  }, [signupUrl, t])

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => {
        void handleCopy()
      }}
    >
      {copied ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : (
        <LinkIcon className="size-4" aria-hidden="true" />
      )}
      {copied ? t("onboardingCopySignupLinkDone") : t("onboardingCopySignupLink")}
    </Button>
  )
}
