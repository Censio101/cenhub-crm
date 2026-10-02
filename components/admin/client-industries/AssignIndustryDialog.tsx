"use client"

import { useState } from "react"
import { CheckIcon, FolderIcon, Loader2Icon, SearchIcon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  /**
   * Categories that can still be added. In "subcategories only" mode this holds the single
   * assigned category whose subcategories are edited.
   */
  categories: BusinessCategory[]
  /** When set, the popup edits which subcategories of this (already assigned) category are on. */
  onlySubcategoriesOf?: string
  /** Subcategories already assigned (pre-selected in "subcategories only" mode). */
  initialSubcategoryIds?: string[]
  /** Resolves true once saved; the popup stays open with a spinner until then. */
  onSubmit: (categoryIds: string[], subcategoryIds: string[]) => Promise<boolean>
  onClose: () => void
}

function SubPill({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string
  on: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium leading-5 transition-colors disabled:opacity-60",
        on
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-[#d3c3b2] bg-white text-foreground hover:border-primary/50 hover:bg-primary/5"
      )}
      onClick={onClick}
    >
      {on ? <CheckIcon className="size-3.5" aria-hidden /> : null}
      {label}
    </button>
  )
}

/**
 * Step 1 picks categories, step 2 (optional) picks their subcategories.
 * Mount only while open so the selection resets each time.
 */
export function AssignIndustryDialog({
  categories,
  onlySubcategoriesOf,
  initialSubcategoryIds,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const subsOnly = onlySubcategoriesOf !== undefined
  const lockedCategory = subsOnly ? categories.find((c) => c.id === onlySubcategoriesOf) : undefined

  const [step, setStep] = useState<1 | 2>(subsOnly ? 2 : 1)
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [subIds, setSubIds] = useState<string[]>(initialSubcategoryIds ?? [])
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = search.trim().toLowerCase()
  const visible = query
    ? categories.filter((cat) => businessCategoryLabel(cat).toLowerCase().includes(query))
    : categories

  // Step 2 shows the picked categories (or the one locked category) that have subcategories.
  const subSections = (
    subsOnly
      ? lockedCategory
        ? [lockedCategory]
        : []
      : categories.filter((c) => categoryIds.includes(c.id))
  ).filter((cat) => cat.subcategories.length > 0)
  const needsStep2 = subSections.length > 0

  const initialKey = [...(initialSubcategoryIds ?? [])].sort().join("|")
  const changed = [...subIds].sort().join("|") !== initialKey

  function toggleCategory(id: string) {
    const wasTicked = categoryIds.includes(id)
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
    // Subcategories only stay picked while their category is picked.
    if (wasTicked) {
      const own = new Set(categories.find((c) => c.id === id)?.subcategories.map((s) => s.id))
      setSubIds((current) => current.filter((s) => !own.has(s)))
    }
  }

  function toggleSub(id: string) {
    setSubIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  function setAllSubs(cat: BusinessCategory) {
    const own = cat.subcategories.map((sub) => sub.id)
    setSubIds((current) =>
      own.every((id) => current.includes(id))
        ? current.filter((id) => !own.includes(id))
        : [...new Set([...current, ...own])]
    )
  }

  async function submit() {
    if (saving) return
    setSaving(true)
    setError(null)
    const ok = await onSubmit(subsOnly ? [] : categoryIds, subIds)
    // On success the parent unmounts this popup.
    if (!ok) {
      setError(t("leadSheetsLoadError"))
      setSaving(false)
    }
  }

  const onStep1 = step === 1 && !subsOnly
  const title = subsOnly ? t("clientIndustriesManageSubsTitle") : t("clientIndustriesAddCategory")
  const subtitle = subsOnly
    ? lockedCategory
      ? t("businessCategoriesAddSubsSubtitle").replace(
          "{category}",
          businessCategoryLabel(lockedCategory)
        )
      : undefined
    : onStep1
      ? t("clientIndustriesStepOne")
      : t("clientIndustriesStepTwo")

  const spinner = saving ? <Loader2Icon className="size-4 animate-spin" /> : null
  const addLabel =
    categoryIds.length > 1 && (onStep1 || !needsStep2)
      ? t("businessCategoriesAddCount").replace("{count}", String(categoryIds.length))
      : t("businessCategoriesAddAction")

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      dismissible={categoryIds.length === 0 && !changed}
      busy={saving}
      onClose={onClose}
      footer={
        onStep1 ? (
          <>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              {t("leadSheetCancel")}
            </Button>
            <Button
              type="button"
              disabled={categoryIds.length === 0 || saving}
              onClick={() => (needsStep2 ? setStep(2) : void submit())}
            >
              {needsStep2 ? null : spinner}
              {needsStep2 ? t("clientIndustriesNext") : addLabel}
            </Button>
          </>
        ) : (
          <>
            {subsOnly ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
                {t("leadSheetCancel")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => setStep(1)}>
                {t("clientIndustriesBack")}
              </Button>
            )}
            <Button
              type="button"
              disabled={saving || (subsOnly && !changed)}
              onClick={() => void submit()}
            >
              {spinner}
              {subsOnly
                ? t("businessCategoriesSave")
                : subIds.length === 0
                  ? t("clientIndustriesSkipAndAdd")
                  : t("businessCategoriesAddAction")}
            </Button>
          </>
        )
      }
    >
      {onStep1 ? (
        <>
          <label className="relative block">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              autoFocus
              className={cn(adminFieldClass, "h-10 pl-10 text-sm")}
              placeholder={t("businessCategoriesSearchPlaceholder")}
              value={search}
              disabled={saving}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <ul className="max-h-[20rem] space-y-1.5 overflow-y-auto">
            {visible.map((cat) => {
              const ticked = categoryIds.includes(cat.id)
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={ticked}
                    disabled={saving}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                      ticked
                        ? "border-primary/60 bg-primary/5"
                        : "border-[#e8e0d8] bg-white hover:border-primary/40"
                    )}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        ticked
                          ? "border-primary bg-primary text-white"
                          : "border-[#d3c3b2] bg-white"
                      )}
                      aria-hidden
                    >
                      {ticked ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {businessCategoryLabel(cat)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {cat.subcategories.length > 0
                        ? t("leadSheetsSubcategoryCount").replace(
                            "{count}",
                            String(cat.subcategories.length)
                          )
                        : t("clientIndustriesNoSubs")}
                    </span>
                  </button>
                </li>
              )
            })}
            {visible.length === 0 ? (
              <li className="px-1 py-3 text-sm text-muted-foreground">
                {t("businessCategoriesSearchEmpty")}
              </li>
            ) : null}
          </ul>
        </>
      ) : (
        <div className="space-y-4">
          {!subsOnly ? (
            <p className="text-sm text-muted-foreground">{t("clientIndustriesDialogSubsHint")}</p>
          ) : null}
          {subSections.map((cat) => (
            <section key={cat.id} className="space-y-2">
              <div className="flex items-center gap-2">
                {!subsOnly ? (
                  <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                    <FolderIcon className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{businessCategoryLabel(cat)}</span>
                  </p>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t("clientIndustriesPickedCount")
                    .replace(
                      "{selected}",
                      String(cat.subcategories.filter((sub) => subIds.includes(sub.id)).length)
                    )
                    .replace("{total}", String(cat.subcategories.length))}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  onClick={() => setAllSubs(cat)}
                >
                  {cat.subcategories.every((sub) => subIds.includes(sub.id))
                    ? t("clientIndustriesClearShort")
                    : t("clientIndustriesSelectAllShort")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.subcategories.map((sub) => (
                  <SubPill
                    key={sub.id}
                    label={businessCategoryLabel(sub)}
                    on={subIds.includes(sub.id)}
                    disabled={saving}
                    onClick={() => toggleSub(sub.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  )
}
