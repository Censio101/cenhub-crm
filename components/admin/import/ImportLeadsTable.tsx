"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { ImportPreviewRow } from "@/lib/import/run-batches"
import { previewCellText } from "@/lib/import/preview-cell"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  columns: LeadSheetTemplateColumn[]
  rows: ImportPreviewRow[]
}

/** Leads that would be created, laid out with the client's real lead sheet columns. */
export function ImportLeadsTable({ columns, rows }: Props) {
  const { t } = useLanguage()
  return (
    <div className={cn(adminSectionCardClass, "overflow-x-auto")}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="bg-[#faf8f6] text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{t("importRowLabel")}</th>
            {columns.map((column) => (
              <th key={column.id} className="px-3 py-2 font-medium whitespace-nowrap">
                {columnDisplayLabel(column, t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efe8e0]">
          {rows.map((row) => (
            <tr key={row.rowNumber} className={cn(row.warnings.length > 0 && "bg-amber-50/50")}>
              <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                {row.rowNumber}
              </td>
              {columns.map((column) => (
                <td key={column.id} className="max-w-[16rem] truncate px-3 py-2 whitespace-nowrap">
                  {previewCellText(column, row.lead, t) || (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
