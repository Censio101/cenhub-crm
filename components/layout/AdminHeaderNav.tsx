"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Building2Icon, LayoutDashboardIcon, LayoutGridIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import {
  isAdminAllClientsNavActive,
  isAdminWorkspaceNavActive,
} from "@/lib/layout/admin-profile-nav-active"
import { isClientDashboardPath } from "@/lib/layout/app-paths"
import { cn } from "cn"

function AdminHeaderLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof LayoutGridIcon
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 px-2.5 py-2 text-base font-medium whitespace-nowrap transition-colors sm:px-3",
        "border-b-2 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none",
        active
          ? "border-primary text-white"
          : "border-transparent text-white/70 hover:border-primary hover:text-white"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden md:inline">{label}</span>
    </Link>
  )
}

export function AdminHeaderNav() {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { t } = useLanguage()
  const { mustPickClient, resolvingActiveClient } = useAdminClientPickerGate()
  const { organization, setActiveOrganization } = useActiveOrganization()
  const [openingDashboard, setOpeningDashboard] = useState(false)

  const activeClientSlug = organization?.slug ?? null

  const workspaceActive = isAdminWorkspaceNavActive(pathname)
  const allClientsActive = isAdminAllClientsNavActive(pathname)
  const onClientDashboard = isClientDashboardPath(pathname)

  useEffect(() => {
    router.prefetch("/admin/overview")
    router.prefetch("/admin/clients")
    router.prefetch("/")
  }, [router])

  async function openDashboard() {
    setOpeningDashboard(true)
    try {
      if (!activeClientSlug) {
        router.push("/")
        return
      }
      await openClientDashboard(activeClientSlug, setActiveOrganization, { router, path: "/" })
    } finally {
      setOpeningDashboard(false)
    }
  }

  return (
    <div
      className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1"
      role="navigation"
      aria-label={t("adminTopbarNavAria")}
    >
      <AdminHeaderLink
        href="/admin/overview"
        label={t("navAdminWorkspace")}
        icon={LayoutGridIcon}
        active={workspaceActive}
      />
      {!mustPickClient && !resolvingActiveClient ? (
        <AdminHeaderLink
          href="/admin/clients"
          label={t("navAllClients")}
          icon={Building2Icon}
          active={allClientsActive}
        />
      ) : null}
      {!onClientDashboard ? (
        <button
          type="button"
          disabled={openingDashboard}
          onClick={() => void openDashboard()}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 px-2.5 py-2 text-base font-medium whitespace-nowrap transition-colors sm:px-3",
            "border-b-2 border-transparent text-white/70 hover:border-primary hover:text-white",
            "focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
          )}
        >
          <LayoutDashboardIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline">
            {openingDashboard ? t("openingDashboard") : t("profileMenuClientDashboard")}
          </span>
        </button>
      ) : null}
    </div>
  )
}
