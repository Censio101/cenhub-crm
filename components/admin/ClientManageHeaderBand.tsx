"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

export const clientManageHeaderBandClassName = "shrink-0 px-4 py-3"

export const clientManageHeaderTitleClassName =
  "text-xs font-semibold tracking-[0.14em] text-primary uppercase"

/** Matches gap above the sidebar client name card. */
export const clientManageClientCardTopGapClassName = "mt-3"

type ClientManageHeaderBandProps = {
  variant: "sidebar" | "mainAlign"
}

export function ClientManageHeaderBand({ variant }: ClientManageHeaderBandProps) {
  const { t } = useLanguage()

  return (
    <div
      className={cn(
        clientManageHeaderBandClassName,
        variant === "sidebar" && "border-b border-[#e8e0d8]",
        variant === "mainAlign" && "hidden md:block"
      )}
      aria-hidden={variant === "mainAlign" ? true : undefined}
    >
      <p
        className={cn(
          clientManageHeaderTitleClassName,
          variant === "mainAlign" && "invisible"
        )}
      >
        {t("adminClientScopeBadge")}
      </p>
    </div>
  )
}
