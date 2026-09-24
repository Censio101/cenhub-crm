"use client"

import { CheckIcon } from "lucide-react"

import {
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

type Props = {
  className?: string
  /** When the thank-you copy lives in the page header (public /tilmelding). */
  compact?: boolean
}

export function OnboardingApplicationSuccess({ className, compact = false }: Props) {
  const { t } = useLanguage()

  if (compact) {
    return (
      <div
        className={cn(
          adminSectionCardClass,
          "flex flex-col items-center overflow-hidden bg-white px-6 py-10 text-center shadow-[0_2px_12px_rgba(26,18,8,0.06)] sm:px-10 sm:py-12",
          className
        )}
        role="status"
      >
        <span
          className={cn(
            adminIconBoxClass("brand"),
            "size-14 rounded-full [&_svg]:size-7"
          )}
          aria-hidden="true"
        >
          <CheckIcon strokeWidth={2.5} />
        </span>
        <p className="mt-5 text-sm font-medium text-muted-foreground">
          {t("onboardingSuccessReceivedHint")}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        adminSectionCardClass,
        "overflow-hidden bg-white text-center animate-in fade-in-0 duration-300",
        className
      )}
      role="status"
    >
      <div className="border-b border-[#e8e0d8] bg-[#faf8f6] px-6 py-8 sm:px-10">
        <span
          className={cn(
            adminIconBoxClass("brand"),
            "mx-auto size-12 rounded-full [&_svg]:size-6"
          )}
          aria-hidden="true"
        >
          <CheckIcon strokeWidth={2.5} />
        </span>
      </div>
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("onboardingSuccessTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {t("onboardingSuccessBody")}
        </p>
      </div>
    </div>
  )
}
