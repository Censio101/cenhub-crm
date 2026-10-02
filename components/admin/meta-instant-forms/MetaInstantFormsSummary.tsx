"use client"

import { Loader2Icon, RefreshCwIcon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type {
  MetaInstantFormsFilter,
  MetaInstantFormsSummary,
} from "@/components/admin/meta-instant-forms/types"
import { cn } from "cn"

type Props = {
  summary: MetaInstantFormsSummary
  filter: MetaInstantFormsFilter
  onFilterChange: (filter: MetaInstantFormsFilter) => void
  /** When false, show counts only (Overview tab). */
  interactive?: boolean
  onRefresh?: () => void
  refreshDisabled?: boolean
  refreshBusy?: boolean
  /** When the list was last confirmed by Meta. */
  syncedAt?: string | null
}

const FILTERS: MetaInstantFormsFilter[] = ["all", "enabled", "disabled"]

export function MetaInstantFormsSummaryBar({
  summary,
  filter,
  onFilterChange,
  interactive = true,
  onRefresh,
  refreshDisabled = false,
  refreshBusy = false,
  syncedAt = null,
}: Props) {
  const { t } = useLanguage()

  const cards: {
    key: MetaInstantFormsFilter | "total"
    value: number
    labelKey:
      | "metaInstantFormsSummaryTotal"
      | "metaInstantFormsSummaryEnabled"
      | "metaInstantFormsSummaryDisabled"
  }[] = [
    { key: "total", value: summary.total, labelKey: "metaInstantFormsSummaryTotal" },
    { key: "enabled", value: summary.enabled, labelKey: "metaInstantFormsSummaryEnabled" },
    {
      key: "disabled",
      value: summary.total - summary.enabled,
      labelKey: "metaInstantFormsSummaryDisabled",
    },
  ]

  const filterLabel = (f: MetaInstantFormsFilter) => {
    switch (f) {
      case "all":
        return t("metaInstantFormsFilterAll")
      case "enabled":
        return t("metaInstantFormsFilterEnabled")
      case "disabled":
        return t("metaInstantFormsFilterDisabled")
    }
  }

  if (!interactive) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.labelKey} className={cn(adminSectionCardClass, "px-4 py-3 text-left")}>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{t(card.labelKey)}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              filter === f
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-[#e8e0d8] bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
            onClick={() => onFilterChange(f)}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>
      {onRefresh ? (
        <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          {syncedAt ? (
            <span className="text-xs text-muted-foreground sm:text-right">
              {t("metaInstantFormsUpdatedAt").replace(
                "{time}",
                new Date(syncedAt).toLocaleString()
              )}
            </span>
          ) : null}
          <button
            type="button"
            disabled={refreshDisabled || refreshBusy}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors",
              "hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
              "w-full sm:w-auto sm:shrink-0"
            )}
            onClick={onRefresh}
          >
            {refreshBusy ? (
              <Loader2Icon className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <RefreshCwIcon className="size-4 shrink-0" aria-hidden />
            )}
            {t("metaInstantFormsRefresh")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
