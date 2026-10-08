"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import { useAdminClientAutoSelect } from "@/components/admin/AdminClientAutoSelectContext"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { recordRecentClientSlug } from "@/lib/admin/client-picker-recents"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function SelectClientEmptyState() {
  const { t } = useLanguage()
  const { autoSelecting } = useAdminClientAutoSelect()
  const { needsClientSelection, loading: sessionLoading, setActiveOrganization } =
    useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)

  const showOpeningSpinner =
    needsClientSelection && (sessionLoading || listLoading || autoSelecting || openingSlug !== null)

  async function handleOpen(slug: string) {
    if (openingSlug) return
    setOpeningSlug(slug)
    try {
      const ok = await setActiveOrganization(slug)
      if (ok) recordRecentClientSlug(slug)
    } finally {
      setOpeningSlug(null)
    }
  }

  if (showOpeningSpinner) {
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

  if (needsClientSelection && pickerOrganizations.length > 0) {
    return (
      <div
        className={cn(
          "admin-ui",
          outfit.className,
          "mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-[#d3c3b2] bg-card px-6 py-8 shadow-[0_1px_3px_rgba(26,18,8,0.06)] sm:px-8"
        )}
      >
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">{t("clientPickerTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientPickerDescription")}</p>
        </div>
        <ul className="divide-y divide-[#e8e0d8] rounded-xl border border-[#e8e0d8]">
          {pickerOrganizations.slice(0, 8).map((org) => (
            <li
              key={org.slug}
              className="flex items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {formatClientDisplayName(org.name)}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">{org.slug}</p>
              </div>
              <Button
                type="button"
                className="h-9 shrink-0"
                disabled={openingSlug !== null}
                onClick={() => {
                  void handleOpen(org.slug)
                }}
              >
                {t("clientPickerOpenShort")}
              </Button>
            </li>
          ))}
        </ul>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/admin/clients" />}
          className="h-10"
        >
          {t("clientSwitcherFullList")}
        </Button>
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
