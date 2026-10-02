"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

/** The columns as a table header, so it reads at a glance as "this is the leads table". */
export function LeadSheetColumnStrip({ columns }: { columns: LeadSheetTemplateColumn[] }) {
  const { t } = useLanguage()

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8e0d8] bg-[#faf8f6]">
      <ul className="flex w-max min-w-full divide-x divide-[#e8e0d8]">
        {columns.map((column) => (
          <li
            key={column.id}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap text-foreground"
          >
            {column.kind === "custom" ? (
              <span className="size-1.5 rounded-full bg-violet-500" aria-hidden />
            ) : null}
            {columnDisplayLabel(column, t)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LeadSheetColumnStripSkeleton() {
  return <div className="skeleton-shimmer h-10 w-full rounded-xl" aria-busy="true" aria-hidden />
}
