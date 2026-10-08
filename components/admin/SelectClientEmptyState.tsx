"use client"

import Link from "next/link"
import { Loader2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function SelectClientEmptyState() {
  const { t } = useLanguage()
  const { needsClientSelection, loading: sessionLoading } = useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()

  const opening =
    needsClientSelection && (sessionLoading || listLoading || pickerOrganizations.length > 0)

  if (opening) {
    return (
      <div
        className={cn(
          "admin-ui",
          outfit.className,
          "mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-[#d3c3b2] bg-card px-8 py-12 text-center shadow-[0_1px_3px_rgba(26,18,8,0.06)]"
        )}
      >
        <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t("adminOpeningClientWorkspace")}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "admin-ui",
        outfit.className,
        "mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-[#d3c3b2] bg-card px-8 py-12 text-center shadow-[0_1px_3px_rgba(26,18,8,0.06)]"
      )}
    >
      <h2 className="text-lg font-medium text-foreground">{t("clientPickerEmptyListTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("clientPickerEmptyListHint")}</p>
      <Button
        nativeButton={false}
        render={<Link href="/admin/clients" />}
        className="mt-2 h-10"
      >
        {t("navClientSettings")}
      </Button>
    </div>
  )
}
