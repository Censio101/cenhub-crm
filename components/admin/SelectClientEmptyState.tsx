"use client"

import Link from "next/link"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function SelectClientEmptyState() {
  const { t } = useLanguage()

  return (
    <div
      className={cn(
        "admin-ui",
        outfit.className,
        "mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-[#d3c3b2] bg-card px-8 py-12 text-center shadow-[0_1px_3px_rgba(26,18,8,0.06)]"
      )}
    >
      <h2 className="text-lg font-medium text-foreground">{t("selectClientTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("selectClientPrompt")}</p>
      <Button render={<Link href="/admin" />} className="mt-2 h-10">
        {t("allClients")}
      </Button>
    </div>
  )
}
