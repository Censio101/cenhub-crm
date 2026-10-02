"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRightIcon, WrenchIcon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

/**
 * Shows how many services the client's industries give it. Reloads when `refreshKey` changes
 * (the industries were saved), so assigning a category is followed by "N services available".
 */
export function ClientServicesSummary({ slug, refreshKey }: { slug: string; refreshKey: string }) {
  const { t } = useLanguage()
  const [count, setCount] = useState<number | null>(null)

  useAsyncEffect(
    async (signal) => {
      try {
        const res = await fetch(`/api/admin/organizations/${slug}/services`)
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as { services: unknown[] }
        if (!signal.cancelled) setCount(data.services.length)
      } catch {
        if (!signal.cancelled) setCount(null)
      }
    },
    [slug, refreshKey]
  )

  return (
    <Link
      href={adminClientSettingsSectionPath(slug, "services")}
      className={cn(
        adminSectionCardClass,
        "flex items-center gap-3 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-[#faf8f6]"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <WrenchIcon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold">{t("clientNavServices")}</span>
        <span className="block text-muted-foreground">
          {count === null
            ? t("clientServicesSummaryLoading")
            : t("clientServicesSummary").replace("{count}", String(count))}
        </span>
      </span>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
