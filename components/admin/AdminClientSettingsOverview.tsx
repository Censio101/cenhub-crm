"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  CircleDotIcon,
  FileUpIcon,
  Settings2Icon,
  WrenchIcon,
  FunnelIcon,
  SheetIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react"

import { AdminClientCompanySummaryCard } from "@/components/admin/AdminClientCompanySummaryCard"
import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

const SECTIONS: {
  section:
    | "meta"
    | "users"
    | "funnels"
    | "import"
    | "services"
    | "industries"
    | "lead-sheet"
    | "settings"
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
    section: "industries",
    labelKey: "clientNavIndustries",
    descKey: "clientSettingsOverviewIndustriesDesc",
    icon: TagsIcon,
  },
  {
    section: "services",
    labelKey: "clientNavServices",
    descKey: "clientSettingsOverviewServicesDesc",
    icon: WrenchIcon,
  },
  {
    section: "lead-sheet",
    labelKey: "clientNavLeadSheet",
    descKey: "clientSettingsOverviewLeadSheetDesc",
    icon: SheetIcon,
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
  {
    section: "import",
    labelKey: "clientNavImport",
    descKey: "clientSettingsOverviewImportDesc",
    icon: FileUpIcon,
  },
  {
    section: "settings",
    labelKey: "clientNavSettings",
    descKey: "clientSettingsOverviewSettingsDesc",
    icon: Settings2Icon,
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
    <>
      <AdminClientCompanySummaryCard />
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
    </>
  )
}
