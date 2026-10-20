"use client"

import { CheckSquareIcon, EllipsisVerticalIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LeadSheetFilterMenuItem,
  SHEET_CONTROL_CLASS,
  SHEET_CONTROL_IDLE,
} from "@/components/leads/LeadSheetFilterMenu"
import { cn } from "cn"

type Props = {
  onBulkSelect: () => void
}

/** Far-left sheet toolbar menu (Censio admin actions). */
export function LeadSheetToolbarMenu({ onBulkSelect }: Props) {
  const { t } = useLanguage()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("leadSheetToolbarMenuLabel")}
        title={t("leadSheetToolbarMenuLabel")}
        className={cn(
          SHEET_CONTROL_CLASS,
          SHEET_CONTROL_IDLE,
          "h-9 w-9 shrink-0 justify-center px-0 text-muted-foreground hover:text-foreground"
        )}
      >
        <EllipsisVerticalIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-44 rounded-[4px] p-1.5">
        <LeadSheetFilterMenuItem selected={false} onSelect={() => onBulkSelect()}>
          <span className="flex min-w-0 items-center gap-2">
            <CheckSquareIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{t("leadSheetBulkSelectEnter")}</span>
          </span>
        </LeadSheetFilterMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
