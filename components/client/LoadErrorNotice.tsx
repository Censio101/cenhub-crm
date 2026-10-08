"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

/** Inline load error with a retry action. Shown when data is on screen but a refresh failed. */
export function LoadErrorNotice({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry: () => void
  className?: string
}) {
  const { t } = useLanguage()
  return (
    <p
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-700", className)}
      role="status"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-medium underline underline-offset-4 hover:text-amber-900 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        {t("dashboardRetry")}
      </button>
    </p>
  )
}
