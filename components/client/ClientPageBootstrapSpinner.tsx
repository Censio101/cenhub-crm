"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { ClientLoadingRing } from "@/components/client/ClientLoadingRing"
import { cn } from "cn"

/**
 * Session/bootstrap loader (admin gate, etc.) — ring centered in main.
 */
export function ClientPageBootstrapSpinner({ className }: { className?: string }) {
  const { t } = useLanguage()

  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-14rem)] w-full flex-1 items-center justify-center",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label={t("clientPageBootstrapLoading")}
    >
      <ClientLoadingRing />
    </div>
  )
}
