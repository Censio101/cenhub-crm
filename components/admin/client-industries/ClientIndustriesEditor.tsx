"use client"

import { useState } from "react"
import { FolderIcon, PlusIcon, XIcon } from "lucide-react"

import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { SubcategoryPill } from "@/components/admin/business-categories/SubcategoryPill"
import { AssignIndustryDialog } from "@/components/admin/client-industries/AssignIndustryDialog"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

export type ClientIndustriesState = {
  categoryIds: string[]
  subcategoryIds: string[]
}

type Props = {
  categories: BusinessCategory[]
  value: ClientIndustriesState
  busy: boolean
  /** Whether the "add category" popup is open (owned by the page so the header button opens it). */
  adding: boolean
  onOpenAdding: () => void
  onCloseAdding: () => void
  /**
   * Saves the new selection and resolves true when it worked. With `optimistic` the screen
   * updates first (used for quick removals); otherwise it updates only once saved.
   */
  onChange: (next: ClientIndustriesState, options?: { optimistic?: boolean }) => Promise<boolean>
}

export function ClientIndustriesEditor({
  categories,
  value,
  busy,
  adding,
  onOpenAdding,
  onCloseAdding,
  onChange,
}: Props) {
  const { t } = useLanguage()
  const { categoryIds, subcategoryIds } = value
  const [subsFor, setSubsFor] = useState<string | null>(null)

  const assigned = categories.filter((category) => categoryIds.includes(category.id))
  const available = categories.filter((category) => !categoryIds.includes(category.id))

  async function addCategories(newCategoryIds: string[], newSubIds: string[]): Promise<boolean> {
    const ok = await onChange({
      categoryIds: [...new Set([...categoryIds, ...newCategoryIds])],
      subcategoryIds: [...new Set([...subcategoryIds, ...newSubIds])],
    })
    if (ok) onCloseAdding()
    return ok
  }

  /** `chosen` is the full set of picked subcategories for the category (adds and removals). */
  async function saveSubs(categoryId: string, chosen: string[]): Promise<boolean> {
    const own = new Set(
      categories.find((c) => c.id === categoryId)?.subcategories.map((sub) => sub.id) ?? []
    )
    const ok = await onChange({
      categoryIds,
      subcategoryIds: [...subcategoryIds.filter((id) => !own.has(id)), ...chosen],
    })
    if (ok) setSubsFor(null)
    return ok
  }

  function removeCategory(catId: string) {
    const cat = categories.find((category) => category.id === catId)
    const removeSubs = new Set(cat?.subcategories.map((sub) => sub.id) ?? [])
    void onChange(
      {
        categoryIds: categoryIds.filter((id) => id !== catId),
        subcategoryIds: subcategoryIds.filter((id) => !removeSubs.has(id)),
      },
      { optimistic: true }
    )
  }

  function removeSub(subId: string) {
    void onChange(
      { categoryIds, subcategoryIds: subcategoryIds.filter((id) => id !== subId) },
      { optimistic: true }
    )
  }

  const subsDialogCategory = subsFor ? categories.find((c) => c.id === subsFor) : undefined

  return (
    <>
      {assigned.length === 0 ? (
        <div
          className={cn(
            adminSectionCardClass,
            "flex flex-col items-center gap-3 px-4 py-14 text-center"
          )}
        >
          <span className={cn(adminIconBoxClass("neutral"), "size-12 rounded-xl")}>
            <FolderIcon className="size-6" aria-hidden />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            {categories.length === 0
              ? t("clientIndustriesNoCategoriesExist")
              : t("clientIndustriesEmptyHint")}
          </p>
          {available.length > 0 ? (
            <Button type="button" className="h-10 gap-1.5 px-4" onClick={onOpenAdding}>
              <PlusIcon className="size-4" />
              {t("clientIndustriesAddCategory")}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {assigned.map((category) => {
              const label = businessCategoryLabel(category)
              const assignedSubs = category.subcategories.filter((sub) =>
                subcategoryIds.includes(sub.id)
              )
              const canAddMore = assignedSubs.length < category.subcategories.length
              return (
                <li key={category.id} className={cn(adminSectionCardClass, "overflow-hidden")}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className={cn(adminIconBoxClass("brand"), "size-10 rounded-xl")}>
                      <FolderIcon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold leading-tight">{label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {category.subcategories.length === 0
                          ? t("clientIndustriesNoSubs")
                          : assignedSubs.length === 0
                            ? t("clientIndustriesWholeCategory")
                            : t("clientIndustriesSubsProgress")
                                .replace("{selected}", String(assignedSubs.length))
                                .replace("{total}", String(category.subcategories.length))}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      title={t("clientIndustriesRemoveCategory")}
                      aria-label={`${t("clientIndustriesRemoveCategory")} — ${label}`}
                      className="shrink-0 self-start rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-[#f3ebe3] hover:text-red-600 disabled:opacity-50"
                      onClick={() => removeCategory(category.id)}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#e8e0d8] bg-[#fffcf9] px-4 py-3">
                    {category.subcategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("clientIndustriesCategoryHasNoSubs")}
                      </p>
                    ) : (
                      <>
                        {assignedSubs.map((sub) => (
                          <SubcategoryPill
                            key={sub.id}
                            stableKey={sub.id}
                            size="list"
                            label={businessCategoryLabel(sub)}
                            disabled={busy}
                            removeLabel={`${t("leadSheetsEditorIndustryUnassign")} — ${businessCategoryLabel(sub)}`}
                            onRemove={() => removeSub(sub.id)}
                          />
                        ))}
                        {canAddMore ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#d3c3b2] px-2.5 py-0.5 text-xs font-medium leading-5 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
                            onClick={() => setSubsFor(category.id)}
                          >
                            <PlusIcon className="size-3" />
                            {assignedSubs.length === 0
                              ? t("clientIndustriesChooseFrom").replace(
                                  "{count}",
                                  String(category.subcategories.length)
                                )
                              : t("clientIndustriesAddSubShort")}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {adding ? (
        <AssignIndustryDialog
          categories={available}
          onSubmit={addCategories}
          onClose={onCloseAdding}
        />
      ) : null}

      {subsDialogCategory ? (
        <AssignIndustryDialog
          key={subsDialogCategory.id}
          categories={[subsDialogCategory]}
          onlySubcategoriesOf={subsDialogCategory.id}
          initialSubcategoryIds={subsDialogCategory.subcategories
            .filter((sub) => subcategoryIds.includes(sub.id))
            .map((sub) => sub.id)}
          onSubmit={(_ids, chosen) => saveSubs(subsDialogCategory.id, chosen)}
          onClose={() => setSubsFor(null)}
        />
      ) : null}
    </>
  )
}
