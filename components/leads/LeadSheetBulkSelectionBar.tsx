"use client"

import { Trash2Icon, XIcon } from "lucide-react"

import { LeadSheetBulkDeleteDialog } from "@/components/leads/LeadSheetBulkDeleteDialog"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { PopoverTrigger } from "@/components/ui/popover"

type Props = {
  selectedCount: number
  bulkDeleteOpen: boolean
  onBulkDeleteOpenChange: (open: boolean) => void
  onExitMode: () => void
  onBulkDelete: () => void | Promise<void>
}

/** Shown in the sheet toolbar while bulk-select mode is active (Censio admin). */
export function LeadSheetBulkSelectionBar({
  selectedCount,
  bulkDeleteOpen,
  onBulkDeleteOpenChange,
  onExitMode,
  onBulkDelete,
}: Props) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-primary/25 bg-[#fff1e6] px-2 py-1">
      <span className="text-xs font-medium text-[#8a4b12]">
        {selectedCount > 0
          ? t("leadSheetBulkSelected", { count: String(selectedCount) })
          : t("leadSheetBulkSelectModeHint")}
      </span>
      {selectedCount > 0 ? (
        <LeadSheetBulkDeleteDialog
          open={bulkDeleteOpen}
          onOpenChange={onBulkDeleteOpenChange}
          count={selectedCount}
          onConfirm={onBulkDelete}
          trigger={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-[#d3c3b2] bg-white text-xs text-destructive hover:bg-destructive/10"
                />
              }
            >
              <Trash2Icon className="size-3.5" aria-hidden />
              {t("leadSheetBulkDeleteAction")}
            </PopoverTrigger>
          }
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        onClick={onExitMode}
      >
        <XIcon className="size-3.5" aria-hidden />
        {t("leadSheetBulkSelectCancelMode")}
      </Button>
    </div>
  )
}
