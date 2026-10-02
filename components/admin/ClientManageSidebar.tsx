"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  CircleDotIcon,
  FileInputIcon,
  FileUpIcon,
  WrenchIcon,
  FunnelIcon,
  LayoutGridIcon,
  SheetIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react"

import { useOptionalAdminClient } from "@/components/admin/AdminClientContext"
import { ClientManageSidebarClientCard } from "@/components/admin/ClientManageSidebarClientCard"
import { useOptionalAdminClientSwitch } from "@/components/admin/AdminClientSwitchContext"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  adminClientSection,
  adminClientSettingsBasePath,
  adminClientSettingsSectionPath,
  parseAdminClientSlug,
} from "@/lib/admin/admin-routes"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

type NavItem = {
  href: string
  labelKey: MessageKey
  icon: typeof LayoutGridIcon
  active: boolean
}

function ManageNavLink({ item, dimmed }: { item: NavItem; dimmed: boolean }) {
  const { t } = useLanguage()
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      prefetch
      aria-disabled={dimmed || undefined}
      tabIndex={dimmed ? -1 : undefined}
      className={cn(
        "flex w-full min-w-0 max-w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
        item.active
          ? "bg-primary text-white"
          : "text-foreground/80 hover:bg-[#faf8f6] hover:text-foreground",
        dimmed && "pointer-events-none opacity-50"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  )
}

export function ClientManageSidebar() {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { t } = useLanguage()
  const slug = parseAdminClientSlug(pathname)
  const section = adminClientSection(pathname)
  const clientContext = useOptionalAdminClient()
  const switchContext = useOptionalAdminClientSwitch()
  const switchingSlug = switchContext?.switchingSlug ?? null
  const navDimmed =
    switchingSlug !== null ||
    Boolean(
      clientContext?.loading &&
      (clientContext.organization === null || clientContext.organization.slug !== slug)
    )

  useEffect(() => {
    if (!slug) return
    router.prefetch(adminClientSettingsBasePath(slug))
    router.prefetch(adminClientSettingsSectionPath(slug, "meta"))
    router.prefetch(adminClientSettingsSectionPath(slug, "meta-instant-forms"))
    router.prefetch(adminClientSettingsSectionPath(slug, "industries"))
    router.prefetch(adminClientSettingsSectionPath(slug, "lead-sheet"))
    router.prefetch(adminClientSettingsSectionPath(slug, "users"))
    router.prefetch(adminClientSettingsSectionPath(slug, "funnels"))
    router.prefetch(adminClientSettingsSectionPath(slug, "import"))
    router.prefetch(adminClientSettingsSectionPath(slug, "services"))
  }, [router, slug])

  if (!slug) return null

  const items: NavItem[] = [
    {
      href: adminClientSettingsBasePath(slug),
      labelKey: "clientNavOverview",
      icon: LayoutGridIcon,
      active: section === "overview",
    },
    {
      href: adminClientSettingsSectionPath(slug, "meta"),
      labelKey: "clientNavMeta",
      icon: CircleDotIcon,
      active: section === "meta",
    },
    {
      href: adminClientSettingsSectionPath(slug, "meta-instant-forms"),
      labelKey: "clientNavMetaInstantForms",
      icon: FileInputIcon,
      active: section === "meta-instant-forms",
    },
    {
      href: adminClientSettingsSectionPath(slug, "industries"),
      labelKey: "clientNavIndustries",
      icon: TagsIcon,
      active: section === "industries",
    },
    {
      href: adminClientSettingsSectionPath(slug, "services"),
      labelKey: "clientNavServices",
      icon: WrenchIcon,
      active: section === "services",
    },
    {
      href: adminClientSettingsSectionPath(slug, "lead-sheet"),
      labelKey: "clientNavLeadSheet",
      icon: SheetIcon,
      active: section === "lead-sheet",
    },
    {
      href: adminClientSettingsSectionPath(slug, "users"),
      labelKey: "clientNavUsers",
      icon: UsersIcon,
      active: section === "users",
    },
    {
      href: adminClientSettingsSectionPath(slug, "funnels"),
      labelKey: "clientNavFunnels",
      icon: FunnelIcon,
      active: section === "funnels",
    },
    {
      href: adminClientSettingsSectionPath(slug, "import"),
      labelKey: "clientNavImport",
      icon: FileUpIcon,
      active: section === "import",
    },
  ]

  return (
    <aside
      className={cn(
        "flex min-h-full w-full min-w-0 max-w-full shrink-0 flex-col self-stretch overflow-x-clip border-b border-[#e8e0d8] bg-white md:w-56 md:max-w-56 md:border-r md:border-b-0",
        navDimmed && "opacity-95"
      )}
      aria-busy={navDimmed || undefined}
      aria-label={t("clientSettingsLabel")}
    >
      <div className="border-b border-[#e8e0d8] px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {t("adminClientScopeBadge")}
        </p>
      </div>

      <ClientManageSidebarClientCard routeSlug={slug} />

      <nav className="flex flex-1 flex-col gap-1 overflow-x-clip px-3 py-3">
        {items.map((item) => (
          <ManageNavLink key={item.href} item={item} dimmed={navDimmed} />
        ))}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-[#e8e0d8] px-3 py-3">
        <Link
          href="/admin/clients"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-[#faf8f6] hover:text-foreground",
            navDimmed && "pointer-events-none opacity-50"
          )}
        >
          {t("adminClientScopeAllClients")}
        </Link>
        <Link
          href="/admin"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-[#faf8f6] hover:text-foreground",
            navDimmed && "pointer-events-none opacity-50"
          )}
        >
          {t("clientManageExitCensioAdmin")}
        </Link>
      </div>
    </aside>
  )
}
