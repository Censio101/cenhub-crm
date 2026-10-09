"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, GripHorizontalIcon } from "lucide-react"

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
  /** Shown just before the pan hint and arrows (export, …). */
  toolbarEnd?: ReactNode
}

type Edges = { atStart: boolean; atEnd: boolean }

export function LeadSheetScrollArea({
  children,
  className,
  scrollClassName,
  toolbarStart,
  toolbarEnd,
}: Props) {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sheetPanning = useDragToScroll(scrollRef)
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: false })

  // Keep the arrows honest: disabled once there is nothing more to scroll to on that side.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame = 0

    const update = () => {
      frame = 0
      const maxLeft = el.scrollWidth - el.clientWidth
      const next: Edges = { atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= maxLeft - 1 }
      setEdges((prev) =>
        prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    el.addEventListener("scroll", schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    const table = el.querySelector("table")
    if (table) observer.observe(table)
    update()

    return () => {
      el.removeEventListener("scroll", schedule)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  function scrollSheet(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.75), behavior: "smooth" })
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[#f7f7f5] px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">{toolbarStart}</div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {toolbarEnd}
          <span className="hidden cursor-grab items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:inline-flex">
            <GripHorizontalIcon className="size-3.5" aria-hidden="true" />
            {t("leadSheetPanHint")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-[#d3c3b2] bg-white shadow-sm hover:border-primary/40 hover:bg-[#fffaf5]"
            aria-label={t("leadSheetScrollLeft")}
            title={t("leadSheetScrollLeft")}
            disabled={edges.atStart}
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
            disabled={edges.atEnd}
            onClick={() => scrollSheet(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          // Horizontal overscroll stays inside the sheet (no browser back-swipe); vertical still
          // hands over to the page once the sheet reaches its end.
          "lead-sheet-scroll min-h-0 flex-1 overflow-auto overscroll-x-contain overscroll-y-auto",
          sheetPanning ? "cursor-grabbing select-none" : "cursor-grab",
          // Rows inherit grab (not pointer) so panning is obvious; controls keep their own cursors.
          "[&_tbody_tr]:cursor-grab",
          "[&_thead_tr]:cursor-grab",
          "[&_input:not(:disabled)]:cursor-text",
          "[&_textarea]:cursor-text",
          "[&_button]:cursor-pointer",
          "[&_a]:cursor-pointer",
          "[&_[role=combobox]]:cursor-pointer",
          "[&_select]:cursor-pointer",
          "[&_input:disabled]:cursor-not-allowed",
          "[&::-webkit-scrollbar]:size-3 [&::-webkit-scrollbar-corner]:bg-[#efeae4] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#efeae4] [&::-webkit-scrollbar-thumb]:bg-[#b9ada0] hover:[&::-webkit-scrollbar-thumb]:bg-[#9d8f80] [&::-webkit-scrollbar-track]:bg-[#efeae4]",
          scrollClassName
        )}
      >
        {children}
      </div>
      {/* One transparent layer gives the grabbing cursor everywhere and stops hover repaints
          while panning, instead of restyling every cell. */}
      {sheetPanning ? (
        <div aria-hidden="true" className="fixed inset-0 z-[70] cursor-grabbing" />
      ) : null}
    </div>
  )
}
