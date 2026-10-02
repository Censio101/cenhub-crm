"use client"

import { ArrowLeftRightIcon, LayersIcon, TableIcon, UserIcon } from "lucide-react"

import {
  adminIconBoxClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { LeadSheetColumnStrip } from "@/components/admin/client-lead-sheet/LeadSheetColumnStrip"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  resolved: ResolvedLeadSheetConfig
  /** The sheet belongs to this client only (not a shared template). */
  isClientOwned: boolean
  onChange: () => void
}

/** What this client is on right now: the sheet's name, its kind and its columns. */
export function ClientLeadSheetHero({ resolved, isClientOwned, onChange }: Props) {
  const { t } = useLanguage()
  const { template, columns } = resolved
  const KindIcon = isClientOwned ? UserIcon : LayersIcon

  return (
    <section className={cn(adminSectionCardClass, "space-y-4 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={adminIconBoxClass("brand")}>
          <TableIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("clientLeadSheetCurrentLabel")}
          </p>
          <h3 className="truncate text-lg font-semibold tracking-tight" title={template.name}>
            {template.name}
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2", adminOutlineButtonClass)}
          onClick={onChange}
        >
          <ArrowLeftRightIcon className="size-4" aria-hidden />
          {t("clientLeadSheetChange")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          <KindIcon className="size-3.5" aria-hidden />
          {isClientOwned ? t("clientLeadSheetKindOwn") : t("clientLeadSheetKindShared")}
        </span>
        <span className="rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {t("leadSheetsColumnCount").replace("{count}", String(columns.length))}
        </span>
      </div>

      <LeadSheetColumnStrip columns={columns} />
    </section>
  )
}
