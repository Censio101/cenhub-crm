"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  Building2Icon,
  ClipboardListIcon,
  LayersIcon,
  MailIcon,
  RefreshCwIcon,
  Settings2Icon,
  SettingsIcon,
  ShieldCheckIcon,
  TagsIcon,
  UserCircleIcon,
  WrenchIcon,
} from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

type OverviewItem = {
  href: string
  labelKey: MessageKey
  descKey: MessageKey
  icon: typeof Building2Icon
}

const WORKSPACE_ITEMS: OverviewItem[] = [
  {
    href: "/admin/clients",
    labelKey: "navAllClients",
    descKey: "adminWorkspaceOverviewClientSettingsDesc",
    icon: Settings2Icon,
  },
  {
    href: "/admin",
    labelKey: "navClients",
    descKey: "adminWorkspaceOverviewClientsHubDesc",
    icon: Building2Icon,
  },
  {
    href: "/admin/onboarding",
    labelKey: "navOnboarding",
    descKey: "adminWorkspaceOverviewOnboardingDesc",
    icon: ClipboardListIcon,
  },
  {
    href: "/admin/business-categories",
    labelKey: "navBusinessCategories",
    descKey: "adminWorkspaceOverviewBusinessCategoriesDesc",
    icon: TagsIcon,
  },
  {
    href: "/admin/services",
    labelKey: "navServices",
    descKey: "adminWorkspaceOverviewServicesDesc",
    icon: WrenchIcon,
  },
  {
    href: "/admin/lead-sheets",
    labelKey: "navLeadSheets",
    descKey: "adminWorkspaceOverviewLeadSheetsDesc",
    icon: LayersIcon,
  },
  {
    href: "/admin/meta-sync",
    labelKey: "navMetaSync",
    descKey: "adminWorkspaceOverviewMetaSyncDesc",
    icon: RefreshCwIcon,
  },
]

const ACCOUNT_ITEMS: OverviewItem[] = [
  {
    href: "/admin/admins",
    labelKey: "navInviteAdmins",
    descKey: "adminWorkspaceOverviewAdminsDesc",
    icon: ShieldCheckIcon,
  },
  {
    href: "/admin/integrations",
    labelKey: "navIntegrations",
    descKey: "adminWorkspaceOverviewIntegrationsDesc",
    icon: MailIcon,
  },
  {
    href: "/admin/settings",
    labelKey: "navSettings",
    descKey: "adminWorkspaceOverviewSettingsDesc",
    icon: SettingsIcon,
  },
  {
    href: "/admin/konto",
    labelKey: "navMyAccount",
    descKey: "adminWorkspaceOverviewAccountDesc",
    icon: UserCircleIcon,
  },
]

function OverviewGrid({ items }: { items: OverviewItem[] }) {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href)
    }
  }, [items, router])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(({ href, labelKey, descKey, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          className={cn(
            adminSectionCardClass,
            "flex flex-col gap-3 px-5 py-4 transition-colors hover:border-primary/30 hover:bg-[#faf8f6]"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">{t(labelKey)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(descKey)}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function AdminWorkspaceOverview() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("adminWorkspaceOverviewTitle")}
        </h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("adminSidebarWorkspace")}
        </h2>
        <OverviewGrid items={WORKSPACE_ITEMS} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("adminSidebarAccount")}
        </h2>
        <OverviewGrid items={ACCOUNT_ITEMS} />
      </section>
    </div>
  )
}
