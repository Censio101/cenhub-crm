"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  CircleDotIcon,
  FlaskConicalIcon,
  FunnelIcon,
  UsersIcon,
} from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

const SECTIONS: {
  section: "meta" | "demo" | "users" | "funnels"
  labelKey: MessageKey
  descKey: MessageKey
  icon: typeof CircleDotIcon
}[] = [
  {
    section: "meta",
    labelKey: "clientNavMeta",
    descKey: "clientSettingsOverviewMetaDesc",
    icon: CircleDotIcon,
  },
  {
    section: "demo",
    labelKey: "clientNavDemo",
    descKey: "clientSettingsOverviewDemoDesc",
    icon: FlaskConicalIcon,
  },
  {
    section: "users",
    labelKey: "clientNavUsers",
    descKey: "clientSettingsOverviewUsersDesc",
    icon: UsersIcon,
  },
  {
    section: "funnels",
    labelKey: "clientNavFunnels",
    descKey: "clientSettingsOverviewFunnelsDesc",
    icon: FunnelIcon,
  },
]

export function AdminClientSettingsOverview() {
  const router = useRouter()
  const { t } = useLanguage()
  const { slug } = useAdminClient()

  useEffect(() => {
    for (const { section } of SECTIONS) {
      router.prefetch(adminClientSettingsSectionPath(slug, section))
    }
  }, [router, slug])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SECTIONS.map(({ section, labelKey, descKey, icon: Icon }) => (
        <Link
          key={section}
          href={adminClientSettingsSectionPath(slug, section)}
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
