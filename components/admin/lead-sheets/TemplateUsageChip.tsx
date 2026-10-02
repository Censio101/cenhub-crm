"use client"

import { UsersIcon } from "lucide-react"

import { usedByLabel } from "@/components/admin/lead-sheets/template-usage"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

type Props = {
  count: number
  /** Matches the pill size used next to it (`list` = 12px, `summary` = 14px). */
  size?: "list" | "summary"
  className?: string
}

/** Small person icon + client count, sized like the Default badge and industry tags. */
export function TemplateUsageChip({ count, size = "list", className }: Props) {
  const { t } = useLanguage()
  const label = usedByLabel(count, t)

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#d3c3b2] bg-white font-medium text-foreground shadow-sm",
        size === "summary" ? "px-2.5 py-0.5 text-sm leading-6" : "px-2.5 py-0.5 text-xs leading-5",
        className
      )}
    >
      <UsersIcon
        className={cn("shrink-0", size === "summary" ? "size-3.5" : "size-3")}
        aria-hidden
      />
      <span className="tabular-nums" aria-hidden>
        {count}
      </span>
    </span>
  )
}
