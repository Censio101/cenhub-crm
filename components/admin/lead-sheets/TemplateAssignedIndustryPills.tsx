"use client"

import { useMemo } from "react"

import { SubcategoryPill } from "@/components/admin/business-categories/SubcategoryPill"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

const LIST_MAX_PILLS = 5

type Props = {
  categoryIds: string[]
  categories: BusinessCategory[]
  maxVisible?: number
  /** `summary` uses 14px text (editor header); `list` is the compact 12px used in lists. */
  size?: "list" | "summary"
}

export function TemplateAssignedIndustryPills({
  categoryIds,
  categories,
  maxVisible = LIST_MAX_PILLS,
  size = "list",
}: Props) {
  const large = size === "summary"
  const { t } = useLanguage()

  const pills = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, businessCategoryLabel(c)]))
    return categoryIds
      .map((id) => ({ id, label: byId.get(id) }))
      .filter((p): p is { id: string; label: string } => Boolean(p.label))
  }, [categories, categoryIds])

  if (pills.length === 0) {
    return (
      <span className={cn("text-muted-foreground", large ? "text-sm leading-6" : "text-xs")}>
        {t("leadSheetsTemplateNoIndustriesShort")}
      </span>
    )
  }

  const visible =
    maxVisible != null && pills.length > maxVisible ? pills.slice(0, maxVisible) : pills
  const overflow = maxVisible != null && pills.length > maxVisible ? pills.length - maxVisible : 0

  return (
    <div className={cn("flex flex-wrap items-center", large ? "gap-1.5" : "gap-1")}>
      {visible.map((p) => (
        <SubcategoryPill key={p.id} stableKey={p.id} label={p.label} readOnly size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center rounded-full border border-[#d3c3b2] bg-[#faf8f6] px-2 py-0.5 font-medium text-muted-foreground shadow-sm",
            large ? "text-sm leading-6" : "text-xs"
          )}
          title={pills
            .slice(maxVisible)
            .map((p) => p.label)
            .join(", ")}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
