"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { PickerOrganization } from "@/lib/admin/client-picker"
import { cn } from "cn"

export function ClientPickerStatusChips({
  organization,
  className,
}: {
  organization: Pick<PickerOrganization, "demoMode" | "metaEnabled">
  className?: string
}) {
  const { t } = useLanguage()

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          organization.demoMode
            ? "bg-amber-100 text-amber-900"
            : "bg-emerald-50 text-emerald-800"
        )}
      >
        {organization.demoMode ? t("demoActive") : t("liveData")}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          organization.metaEnabled
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {organization.metaEnabled ? t("metaEnabled") : t("metaDisabled")}
      </span>
    </div>
  )
}
