"use client"

import { useState } from "react"
import { PencilIcon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { FunnelSheetFilterDialog } from "@/components/admin/funnels/FunnelSheetFilterDialog"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import { formSourceFilterNarrowsColumns } from "@/lib/leads/funnel-sheet-column-profile"
import { cn } from "cn"

type Props = {
  slug: string
  funnel: FunnelDto
  onFunnelChange: (patch: Partial<FunnelDto>) => void
}

const panelClass = "rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm"

function summaryRowClassName() {
  return "flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
}

export function FunnelSheetFilterSummary({ slug, funnel, onFunnelChange }: Props) {
  const { t } = useLanguage()
  const [dialogOpen, setDialogOpen] = useState(false)

  const effectiveLabel = funnelSheetSourceLabel({
    sheet_source_label: funnel.sheetSourceLabel,
    name: funnel.name,
  })
  const usesDefaultLabel = !funnel.sheetSourceLabel?.trim()
  const narrows = formSourceFilterNarrowsColumns(funnel.webhookFieldTargets)
  const columnSummary = narrows
    ? t("funnelSheetFilterColumnsSubset", { count: funnel.webhookFieldTargets?.length ?? 0 })
    : t("funnelSheetFilterColumnsAll")

  async function saveSheetFilter(patch: {
    sheetSourceLabel: string | null
  }): Promise<string | null> {
    const previous = { sheetSourceLabel: funnel.sheetSourceLabel }
    onFunnelChange(patch)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels/${funnel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetSourceLabel: patch.sheetSourceLabel }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "save")
      }
      return null
    } catch {
      onFunnelChange(previous)
      return t("funnelSheetFilterSaveError")
    }
  }

  return (
    <>
      <div className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{t("funnelSheetFilterSectionTitle")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            onClick={() => setDialogOpen(true)}
          >
            <PencilIcon className="size-4" aria-hidden />
            {t("funnelSheetFilterEdit")}
          </Button>
        </div>

        <dl className="mt-3 divide-y divide-[#efe7de]">
          <div className={cn(summaryRowClassName(), "py-2.5 first:pt-0")}>
            <dt className="shrink-0 text-sm text-muted-foreground">{t("funnelSheetSourceLabel")}</dt>
            <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
              {effectiveLabel}
              {usesDefaultLabel ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:mt-0 sm:inline sm:pl-1.5">
                  ({t("funnelSheetSourceLabelDefaultBadge")})
                </span>
              ) : null}
            </dd>
          </div>
          <div className={cn(summaryRowClassName(), "py-2.5 last:pb-0")}>
            <dt className="shrink-0 text-sm text-muted-foreground">
              {t("funnelSheetFilterColumnsWhenFiltered")}
            </dt>
            <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
              {columnSummary}
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:mt-0">
                {t("funnelSheetFilterColumnsFollowsWebhook")}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {dialogOpen ? (
        <FunnelSheetFilterDialog
          funnel={funnel}
          onClose={() => setDialogOpen(false)}
          onSave={saveSheetFilter}
        />
      ) : null}
    </>
  )
}
