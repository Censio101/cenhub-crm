"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { OnboardingApplicationStatus } from "@/lib/db/types"
import { cn } from "cn"

export function OnboardingStatusBadge({
  status,
  className,
}: {
  status: OnboardingApplicationStatus
  className?: string
}) {
  const { t } = useLanguage()
  const label = t(
    status === "pending"
      ? "onboardingStatusPending"
      : status === "approved"
        ? "onboardingStatusApproved"
        : "onboardingStatusRejected"
  )

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold leading-none",
        status === "pending" && "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80",
        status === "approved" && "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/80",
        status === "rejected" && "bg-[#f0ebe4] text-muted-foreground ring-1 ring-[#e8e0d8]",
        className
      )}
    >
      {label}
    </span>
  )
}
