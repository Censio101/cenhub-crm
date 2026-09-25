"use client"

import Link from "next/link"

import { ClientManageIdentitySkeleton } from "@/components/admin/ClientManageIdentitySkeleton"
import { useAdminClientPending } from "@/components/admin/use-admin-client-pending"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { cn } from "cn"

export function ClientManageSidebarClientCard({ routeSlug }: { routeSlug: string }) {
  const { t } = useLanguage()
  const { organization, isPending } = useAdminClientPending()

  const isTransitioning = isPending

  const displaySlug = organization?.slug ?? routeSlug
  const displayName = organization
    ? formatClientDisplayName(organization.name)
    : routeSlug

  const href = adminClientSettingsBasePath(routeSlug)
  const shellClass = cn(
    "mx-3 mt-3 flex min-h-[52px] min-w-0 items-center gap-2.5 rounded-lg border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-2",
    isTransitioning && "border-[#e8e0d8]"
  )

  if (isTransitioning) {
    return (
      <div
        className={shellClass}
        aria-busy="true"
        aria-live="polite"
        aria-label={t("loadingClient")}
      >
        <ClientManageIdentitySkeleton variant="sidebar" />
      </div>
    )
  }

  return (
    <Link
      href={href}
      prefetch
      aria-label={`${displayName}, /${displaySlug}`}
      className={cn(shellClass, "transition-colors hover:border-primary/30")}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-[11px] font-semibold text-white"
        aria-hidden="true"
      >
        {clientInitialsFromName(displayName)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {displayName}
      </span>
    </Link>
  )
}
