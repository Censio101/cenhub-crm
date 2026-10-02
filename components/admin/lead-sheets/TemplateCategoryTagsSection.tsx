"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react"

import { SubcategoryPill } from "@/components/admin/business-categories/SubcategoryPill"
import {
  adminFieldClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  categories: BusinessCategory[]
  categoryIds: string[]
  onToggle: (categoryId: string) => void
  disabled?: boolean
  onSave?: () => void
  saveBusy?: boolean
  /** `plain` renders without the card shell and Manage link (used inside dialogs). */
  variant?: "card" | "plain"
}

export function TemplateCategoryTagsSection({
  categories,
  categoryIds,
  onToggle,
  disabled,
  onSave,
  saveBusy,
  variant = "card",
}: Props) {
  const plain = variant === "plain"
  const { t } = useLanguage()
  const [search, setSearch] = useState("")

  const sorted = useMemo(
    () =>
      [...categories].sort((a, b) =>
        businessCategoryLabel(a).localeCompare(businessCategoryLabel(b))
      ),
    [categories]
  )

  const selected = useMemo(
    () => sorted.filter((cat) => categoryIds.includes(cat.id)),
    [sorted, categoryIds]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((cat) => businessCategoryLabel(cat).toLowerCase().includes(q))
  }, [sorted, search])

  return (
    <div className={cn("space-y-3", !plain && cn(adminSectionCardClass, "p-4 sm:p-5"))}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={cn(plain ? "text-sm font-medium" : "text-sm font-semibold")}>
          {t("leadSheetsEditorIndustryTags")}
        </p>
        {!plain ? (
          <Link
            href="/admin/business-categories"
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-md px-3 text-xs font-medium",
              adminOutlineButtonClass
            )}
          >
            {t("leadSheetsEditorManageIndustries")}
          </Link>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="max-h-24 overflow-y-auto overflow-x-hidden rounded-xl border border-[#e8e0d8] bg-[#faf8f6] p-2.5">
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cat) => (
              <SubcategoryPill
                key={cat.id}
                stableKey={cat.id}
                label={businessCategoryLabel(cat)}
                disabled={disabled}
                removeLabel={t("leadSheetsEditorIndustryUnassign")}
                onRemove={() => onToggle(cat.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#d3c3b2] bg-[#faf8f6]/70 px-3 py-2.5 text-sm text-muted-foreground">
          {t("leadSheetsEditorIndustryTagsNoneSelected")}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("leadSheetsEditorIndustryTagsEmpty")}</p>
      ) : (
        <>
          <label className="relative block">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              className={cn(adminFieldClass, "pl-10")}
              placeholder={t("leadSheetsEditorIndustryTagsSearch")}
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="overflow-hidden rounded-xl border border-[#e8e0d8] bg-[#faf8f6]">
            {filtered.length === 0 ? (
              <p className="flex min-h-48 items-center justify-center px-3 py-6 text-center text-sm text-muted-foreground">
                {t("businessCategoriesSearchEmpty")}
              </p>
            ) : (
              <ul className="max-h-48 min-h-48 space-y-1 overflow-y-auto overscroll-y-contain p-1.5">
                {filtered.map((cat) => {
                  const assigned = categoryIds.includes(cat.id)
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={assigned}
                        onClick={() => onToggle(cat.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                          assigned
                            ? "bg-white text-foreground shadow-[0_1px_2px_rgba(26,18,8,0.04)]"
                            : "text-foreground hover:bg-white",
                          disabled && "pointer-events-none opacity-50"
                        )}
                      >
                        {assigned ? (
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary text-primary-foreground"
                            aria-hidden
                          >
                            <CheckIcon className="size-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span
                            className="size-5 shrink-0 rounded-md border border-[#d3c3b2] bg-white"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {businessCategoryLabel(cat)}
                        </span>
                        <span className="shrink-0 text-xs font-normal text-muted-foreground">
                          {assigned
                            ? t("leadSheetsEditorIndustryAssignedBadge")
                            : t("leadSheetsEditorIndustryTapAssign")}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {onSave ? (
        <div className="flex justify-end pt-1">
          <Button type="button" disabled={disabled || saveBusy} onClick={onSave}>
            {saveBusy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("leadSheetSaveAssignment")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
