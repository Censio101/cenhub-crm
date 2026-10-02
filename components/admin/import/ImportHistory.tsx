"use client"

import { HistoryIcon, Undo2Icon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { LeadImportRecord } from "@/lib/db/lead-imports-repository"
import { cn } from "cn"

type Props = {
  imports: LeadImportRecord[]
  loading: boolean
  onUndo: (record: LeadImportRecord) => void
}

/** Earlier imports for this client, each with an Undo while it is still in place. */
export function ImportHistory({ imports, loading, onUndo }: Props) {
  const { t } = useLanguage()
  if (!loading && imports.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <HistoryIcon className="size-4 text-muted-foreground" aria-hidden />
        {t("importHistory")}
      </h3>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul className={cn(adminSectionCardClass, "divide-y divide-[#efe8e0] overflow-hidden")}>
          {imports.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={record.fileName}>
                  {record.fileName || t("importUntitled")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(record.createdAt).toLocaleString()} ·{" "}
                  {t("importHistoryCounts")
                    .replace("{imported}", record.importedCount.toLocaleString("da-DK"))
                    .replace("{skipped}", record.skippedCount.toLocaleString("da-DK"))}
                </p>
              </div>
              {record.status === "undone" ? (
                <span className="rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {t("importStatusUndone")}
                </span>
              ) : (
                <>
                  {record.status === "running" ? (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                      {t("importStatusRunning")}
                    </span>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => onUndo(record)}>
                    <Undo2Icon className="size-4" aria-hidden />
                    {t("importUndo")}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
