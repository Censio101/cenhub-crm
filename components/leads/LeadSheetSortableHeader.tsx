"use client"

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { nextSortDirection, type SheetSortDirection, type SheetSortState } from "@/lib/leads/sheet-sort"
import { cn } from "cn"

export function LeadSheetSortableHeader({
  columnId,
  label,
  sort,
  onSort,
  className,
}: {
  columnId: string
  label: string
  sort: SheetSortState
  onSort: (columnId: string, direction: SheetSortDirection | null) => void
  className?: string
}) {
  const { t } = useLanguage()
  const active = sort?.columnId === columnId
  const direction = active ? sort.direction : null

  function handleClick() {
    onSort(columnId, nextSortDirection(sort, columnId))
  }

  const SortIcon =
    direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ArrowUpDownIcon

  return (
    <button
      type="button"
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-left text-white hover:text-white/85",
        className
      )}
      aria-label={t("leadSheetSortBy", { column: label })}
      onClick={handleClick}
    >
      <span className="truncate">{label}</span>
      <SortIcon className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-50")} />
    </button>
  )
}
