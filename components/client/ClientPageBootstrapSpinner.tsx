"use client"

import { useEffect, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

const SHOW_DELAY_MS = 150

/**
 * Short bootstrap loader while session/org restores (before the page shell is ready).
 * Fills the whole content area under the header so the ring sits in the true center,
 * and only appears after a short delay so fast loads never flash a spinner.
 */
export function ClientPageBootstrapSpinner({ className }: { className?: string }) {
  const { t } = useLanguage()
  const [showSpinner, setShowSpinner] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSpinner(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className={cn(
        // `flex-1` fills <main>; min-h keeps it centered even if the parent is not a flex column.
        "flex min-h-[calc(100dvh-14rem)] w-full flex-1 items-center justify-center",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label={t("clientPageBootstrapLoading")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative block size-10 transition-opacity duration-500 ease-out",
          showSpinner ? "opacity-100" : "opacity-0"
        )}
      >
        <span className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary [animation-duration:900ms]" />
      </span>
    </div>
  )
}
