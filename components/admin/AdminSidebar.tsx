"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2Icon,
  CircleDotIcon,
  RefreshCwIcon,
  ClipboardListIcon,
  FlaskConicalIcon,
  FunnelIcon,
  MailIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
} from "lucide-react"

import { useOptionalAdminClient } from "@/components/admin/AdminClientContext"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  adminClientBasePath,
  adminClientSection,
  parseAdminClientSlug,
} from "@/lib/admin/admin-routes"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

type NavItem = {
  href: string
  labelKey: MessageKey
  icon: typeof Building2Icon
  active: boolean
}

function SidebarLink({ item }: { item: NavItem }) {
  const { t } = useLanguage()
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
        item.active
          ? "bg-primary text-white shadow-sm"
          : "text-foreground/80 hover:bg-[#faf8f6] hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  )
}

function SidebarSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      {title ? (
        <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname() ?? ""
  const { t } = useLanguage()
  const clientSlug = parseAdminClientSlug(pathname)
  const clientSection = adminClientSection(pathname)

  const clientContext = useOptionalAdminClient()
  const clientName = clientContext?.organization?.name
    ? formatClientDisplayName(clientContext.organization.name)
    : null

  const workspaceItems: NavItem[] = [
    {
      href: "/admin",
      labelKey: "navClients",
      icon: Building2Icon,
      active: pathname === "/admin",
    },
    {
      href: "/admin/onboarding",
      labelKey: "navOnboarding",
      icon: ClipboardListIcon,
      active: pathname.startsWith("/admin/onboarding"),
    },
    {
      href: "/admin/meta-sync",
      labelKey: "navMetaSync",
      icon: RefreshCwIcon,
      active: pathname.startsWith("/admin/meta-sync"),
    },
  ]

  const accountItems: NavItem[] = [
    {
      href: "/admin/admins",
      labelKey: "navInviteAdmins",
      icon: ShieldCheckIcon,
      active: pathname.startsWith("/admin/admins"),
    },
    {
      href: "/admin/integrations",
      labelKey: "navIntegrations",
      icon: MailIcon,
      active: pathname.startsWith("/admin/integrations"),
    },
    {
      href: "/admin/settings",
      labelKey: "navSettings",
      icon: SettingsIcon,
      active: pathname.startsWith("/admin/settings"),
    },
    {
      href: "/admin/konto",
      labelKey: "navMyAccount",
      icon: UserCircleIcon,
      active: pathname.startsWith("/admin/konto"),
    },
  ]

  const clientItems: NavItem[] = clientSlug
    ? [
        {
          href: adminClientBasePath(clientSlug),
          labelKey: "clientNavMeta",
          icon: CircleDotIcon,
          active: clientSection === "meta",
        },
        {
          href: `/admin/${clientSlug}/demo`,
          labelKey: "clientNavDemo",
          icon: FlaskConicalIcon,
          active: clientSection === "demo",
        },
        {
          href: `/admin/${clientSlug}/users`,
          labelKey: "clientNavUsers",
          icon: UsersIcon,
          active: clientSection === "users",
        },
        {
          href: `/admin/${clientSlug}/funnels`,
          labelKey: "clientNavFunnels",
          icon: FunnelIcon,
          active: clientSection === "funnels",
        },
      ]
    : []

  return (
    <aside
      className="flex min-h-full w-full shrink-0 flex-col self-stretch border-b border-[#e8e0d8] bg-white md:w-56 md:border-r md:border-b-0"
      aria-label={t("adminSidebarAria")}
    >
      <div className="border-b border-[#e8e0d8] px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {t("adminWorkspaceTitle")}
        </p>
      </div>

      <nav className="flex flex-1 gap-2 overflow-x-auto px-3 py-3 md:grid md:overflow-visible md:content-start">
        <div className="flex min-w-max gap-2 md:min-w-0 md:grid md:w-full md:gap-4">
          <SidebarSection title={t("adminSidebarWorkspace")}>
            {workspaceItems.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </SidebarSection>

          {clientSlug ? (
            <SidebarSection title={clientName ?? t("clientSettingsLabel")}>
              {clientItems.map((item) => (
                <SidebarLink key={item.href} item={item} />
              ))}
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("adminSidebarAccount")}>
            {accountItems.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </SidebarSection>
        </div>
      </nav>
    </aside>
  )
}
