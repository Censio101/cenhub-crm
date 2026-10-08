"use client"

import { type ReactNode, useRef } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useDragToScroll } from "@/hooks/useDragToScroll"
import { cn } from "cn"

type Props = {
  children: ReactNode
  /** Applied to the outer flex column (scroll + toolbar). */
  className?: string
  scrollClassName?: string
  /** Shown at the start of the toolbar (row count, save status, …). */
  toolbarStart?: ReactNode
}

export function LeadSheetScrollArea({ children, className, scrollClassName, toolbarStart }: Props) {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sheetPanning = useDragToScroll(scrollRef)

  function scrollSheet(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.75), behavior: "smooth" })
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[#f7f7f5] px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          {toolbarStart}
          <p className="hidden truncate text-xs text-muted-foreground lg:block">
            {t("leadSheetScrollHint")}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:inline">
            {t("leadSheetPanHint")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-[#d3c3b2] bg-white shadow-sm hover:border-primary/40 hover:bg-[#fffaf5]"
            aria-label={t("leadSheetScrollLeft")}
            title={t("leadSheetScrollLeft")}
            onClick={() => scrollSheet(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-[#d3c3b2] bg-white shadow-sm hover:border-primary/40 hover:bg-[#fffaf5]"
            aria-label={t("leadSheetScrollRight")}
            title={t("leadSheetScrollRight")}
            onClick={() => scrollSheet(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "lead-sheet-scroll min-h-0 flex-1 overflow-auto overscroll-auto",
          sheetPanning
            ? "cursor-grabbing select-none [&_*]:!cursor-grabbing [&_*]:select-none"
            : "cursor-grab",
          "[&::-webkit-scrollbar]:size-3 [&::-webkit-scrollbar-corner]:bg-[#efeae4] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#efeae4] [&::-webkit-scrollbar-thumb]:bg-[#b9ada0] hover:[&::-webkit-scrollbar-thumb]:bg-[#9d8f80] [&::-webkit-scrollbar-track]:bg-[#efeae4]",
          scrollClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
