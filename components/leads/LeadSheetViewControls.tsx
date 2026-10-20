"use client"

import { ChevronDownIcon, LayoutGridIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SheetDisplayMode } from "@/lib/leads/sheet-column-widths"
import {
  LeadSheetFilterMenuItem,
  SHEET_CONTROL_CLASS,
  SHEET_CONTROL_ACTIVE,
  SHEET_CONTROL_IDLE,
} from "@/components/leads/LeadSheetFilterMenu"
import { cn } from "cn"

type Props = {
  displayMode: SheetDisplayMode
  onDisplayModeChange: (mode: SheetDisplayMode) => void
}

export function LeadSheetViewControls({ displayMode, onDisplayModeChange }: Props) {
  const { t } = useLanguage()

  const modeLabel =
    displayMode === "full" ? t("leadSheetViewModeFull") : t("leadSheetViewModeCompact")

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("leadSheetViewMode")}
        title={t("leadSheetViewMode")}
        className={cn(
          SHEET_CONTROL_CLASS,
          "group h-8 min-w-[7.5rem] justify-between px-2.5 text-xs",
          displayMode === "full" ? SHEET_CONTROL_ACTIVE : SHEET_CONTROL_IDLE
        )}
      >
        <LayoutGridIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{modeLabel}</span>
        <ChevronDownIcon
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 rounded-[4px] p-1.5">
        <LeadSheetFilterMenuItem
          selected={displayMode === "compact"}
          onSelect={() => onDisplayModeChange("compact")}
        >
          {t("leadSheetViewModeCompact")}
        </LeadSheetFilterMenuItem>
        <LeadSheetFilterMenuItem
          selected={displayMode === "full"}
          onSelect={() => onDisplayModeChange("full")}
        >
          {t("leadSheetViewModeFull")}
        </LeadSheetFilterMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
