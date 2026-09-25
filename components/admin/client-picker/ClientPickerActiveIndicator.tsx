"use client"

import { CheckIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

export function ClientPickerActivePill({ className }: { className?: string }) {
  const { t } = useLanguage()

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase shadow-sm",
        className
      )}
    >
      <CheckIcon className="size-3 stroke-[3]" aria-hidden="true" />
      {t("clientPickerActiveNow")}
    </span>
  )
}
