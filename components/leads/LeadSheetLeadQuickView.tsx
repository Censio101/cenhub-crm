"use client"

import { useMemo } from "react"
import { EyeIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCompanyServices } from "@/hooks/useCompanyServices"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { Lead } from "@/lib/leads"
import { leadSheetCellDisplayText } from "@/lib/leads/sheet-column-display"
import { formatCurrencyDKK } from "@/lib/performance/format"
import { cn } from "cn"

function detailValue(
  lead: Lead,
  col: LeadSheetTemplateColumn,
  ctx: Parameters<typeof leadSheetCellDisplayText>[2]
): string {
  if (col.kind === "builtin") {
    if (col.builtinKey === "salesPrice" && lead.salesPrice != null) {
      return formatCurrencyDKK(lead.salesPrice)
    }
    if (col.builtinKey === "profit" && lead.profit != null) {
      return formatCurrencyDKK(lead.profit)
    }
    if (col.builtinKey === "ltv" && lead.ltv != null) {
      return formatCurrencyDKK(lead.ltv)
    }
  }
  return leadSheetCellDisplayText(lead, col, ctx)
}

export function LeadSheetLeadQuickView({
  lead,
  columns,
}: {
  lead: Lead
  columns: readonly LeadSheetTemplateColumn[]
}) {
  const { t } = useLanguage()
  const { enabledServices } = useCompanyServices()

  const rows = useMemo(() => {
    const ctx = { t, enabledServices }
    return columns
      .map((col) => ({
        id: col.id,
        label: columnDisplayLabel(col, t),
        value: detailValue(lead, col, ctx),
      }))
      .filter((row) => row.value.trim().length > 0)
  }, [columns, enabledServices, lead, t])

  const title = lead.fullName.trim() || t("leadSheetQuickViewTitle")

  return (
    <Popover modal={false}>
      <PopoverTrigger
        data-lead-sheet-no-pan="true"
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("leadSheetQuickView")}
            title={t("leadSheetQuickView")}
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
          />
        }
      >
        <EyeIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="z-[80] w-[min(20rem,calc(100vw-2rem))] gap-0 p-0 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
        </div>
        <dl className="max-h-[min(22rem,55vh)] overflow-y-auto px-3 py-2">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("leadSheetQuickViewEmpty")}</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="border-b border-border/60 py-2 last:border-0">
                <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 text-[13px] leading-snug whitespace-pre-wrap text-foreground",
                    row.label.toLowerCase().includes("meta") && "font-mono text-xs"
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))
          )}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
