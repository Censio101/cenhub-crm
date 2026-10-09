"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"

/** Shown on the client dashboard when the organization is Hvidbjerg-certified. */
export function HvidbjergPartnerBadge({ className }: { className?: string }) {
  const { t } = useLanguage()

  return (
    <p
      className={
        className ??
        "mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hvidbjerg-vinduet-logo.png" alt="" className="h-4 w-auto shrink-0" />
      <span>{t("hvidbjergPartnerBadgeLabel")}</span>
    </p>
  )
}
