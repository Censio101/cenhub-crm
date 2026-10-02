"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

type Props = {
  /** Matches the industry pill size used next to it (`list` = 12px, `summary` = 14px). */
  size?: "list" | "summary"
  className?: string
}

/** "Default" marker for the standard template — sized like the industry pills beside it. */
export function DefaultTemplateBadge({ size = "list", className }: Props) {
  const { t } = useLanguage()
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-primary/60 bg-primary/10 font-medium text-primary shadow-sm",
        size === "summary" ? "px-2.5 py-0.5 text-sm leading-6" : "px-2.5 py-0.5 text-xs leading-5",
        className
      )}
    >
      {t("leadSheetsBadgeDefault")}
    </span>
  )
}
