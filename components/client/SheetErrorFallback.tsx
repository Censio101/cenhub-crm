"use client"

import { useEffect } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"

/**
 * Shown by `error.tsx` when the lead or customer sheet throws while drawing.
 * The page header and sidebar stay; only the sheet area is replaced, with a way to try again.
 */
export function SheetErrorFallback({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const { t } = useLanguage()

  useEffect(() => {
    console.error("Lead sheet failed to draw:", error)
  }, [error])

  return (
    <section
      role="alert"
      className="dashboard-card flex flex-col items-start gap-3 px-6 py-8"
    >
      <h2 className="text-base font-medium text-[var(--text-primary)]">
        {t("sheetErrorTitle")}
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">{t("sheetErrorBody")}</p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => retry()}>
          {t("sheetErrorRetry")}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t("sheetErrorReload")}
        </Button>
      </div>
    </section>
  )
}
