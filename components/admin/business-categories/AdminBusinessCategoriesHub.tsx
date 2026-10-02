"use client"

import { useMemo, useState } from "react"
import {
  ChevronDownIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import { adminFieldClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { AdminPageIntro } from "@/components/admin/AdminPageIntro"
import { AdminCardSkeleton } from "@/components/admin/AdminListSkeleton"
import {
  AddCategoryDialog,
  AddSubcategoriesDialog,
  RenameDialog,
} from "@/components/admin/business-categories/CategoryDialogs"
import { SubcategoryPill } from "@/components/admin/business-categories/SubcategoryPill"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { useLeadSheetsHubCategories } from "@/hooks/useLeadSheetsHubCategories"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory, BusinessSubcategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Dialog =
  | { kind: "addCategory" }
  | { kind: "addSubs"; categoryId: string; initialNames?: string[] }
  | { kind: "renameCategory"; categoryId: string }
  | { kind: "deleteCategory"; categoryId: string }
  | { kind: "deleteSub"; categoryId: string; subId: string }

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()
}

function matchesSearch(cat: BusinessCategory, query: string): boolean {
  if (businessCategoryLabel(cat).toLowerCase().includes(query)) return true
  return cat.subcategories.some((sub) => businessCategoryLabel(sub).toLowerCase().includes(query))
}

export function AdminBusinessCategoriesHub() {
  const { t } = useLanguage()
  const { categories, setCategories, loading, error, setError } = useLeadSheetsHubCategories()
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () => (query ? categories.filter((cat) => matchesSearch(cat, query)) : categories),
    [categories, query]
  )

  const findCategory = (id: string) => categories.find((cat) => cat.id === id)
  const isExpanded = (id: string) => query.length > 0 || expanded.has(id)

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function api(path: string, init: RequestInit): Promise<Response> {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    })
    if (!res.ok) throw new Error("save")
    return res
  }

  async function addCategory(nameDa: string, subcategories: string[]): Promise<string | null> {
    if (categories.some((cat) => sameName(cat.nameDa, nameDa))) {
      return t("businessCategoriesDuplicateCategory")
    }
    try {
      const res = await api("/api/admin/business-categories", {
        method: "POST",
        body: JSON.stringify({ nameDa, nameEn: nameDa, subcategories }),
      })
      const { category } = (await res.json()) as { category: BusinessCategory }
      setCategories([...categories, category])
      if (category.subcategories.length > 0) {
        setExpanded((current) => new Set(current).add(category.id))
      }
      setNotice(t("businessCategoriesSave"))
      setDialog(null)
      return null
    } catch {
      return t("businessCategoriesSaveError")
    }
  }

  async function renameCategory(
    id: string,
    nameDa: string,
    nameEn: string
  ): Promise<string | null> {
    if (categories.some((cat) => cat.id !== id && sameName(cat.nameDa, nameDa))) {
      return t("businessCategoriesDuplicateCategory")
    }
    try {
      await api(`/api/admin/business-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ nameDa, nameEn }),
      })
      setCategories(categories.map((cat) => (cat.id === id ? { ...cat, nameDa, nameEn } : cat)))
      setNotice(t("businessCategoriesSave"))
      setDialog(null)
      return null
    } catch {
      return t("businessCategoriesSaveError")
    }
  }

  async function addSubcategories(categoryId: string, names: string[]): Promise<string | null> {
    try {
      const added: BusinessSubcategory[] = []
      for (const name of names) {
        const res = await api(`/api/admin/business-categories/${categoryId}/subcategories`, {
          method: "POST",
          body: JSON.stringify({ name }),
        })
        const { subcategory } = (await res.json()) as { subcategory: BusinessSubcategory }
        added.push(subcategory)
      }
      setCategories(
        categories.map((cat) =>
          cat.id === categoryId ? { ...cat, subcategories: [...cat.subcategories, ...added] } : cat
        )
      )
      setNotice(t("businessCategoriesSave"))
      setDialog(null)
      return null
    } catch {
      return t("businessCategoriesSaveError")
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.kind === "addCategory" || dialog.kind === "addSubs") return
    setBusy(true)
    try {
      if (dialog.kind === "deleteCategory") {
        await api(`/api/admin/business-categories/${dialog.categoryId}`, { method: "DELETE" })
        setCategories(categories.filter((cat) => cat.id !== dialog.categoryId))
      } else if (dialog.kind === "deleteSub") {
        await api(`/api/admin/business-subcategories/${dialog.subId}`, { method: "DELETE" })
        setCategories(
          categories.map((cat) =>
            cat.id === dialog.categoryId
              ? {
                  ...cat,
                  subcategories: cat.subcategories.filter((sub) => sub.id !== dialog.subId),
                }
              : cat
          )
        )
      }
      setNotice(t("businessCategoriesSave"))
    } catch {
      setError(t("businessCategoriesSaveError"))
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const current =
    dialog && dialog.kind !== "addCategory" ? findCategory(dialog.categoryId) : undefined

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <AdminPageIntro
        icon={<FolderIcon className="size-5" />}
        title={t("businessCategoriesTitle")}
        description={t("businessCategoriesIntro")}
        action={
          <Button
            type="button"
            className="h-10 gap-1.5 px-4"
            onClick={() => setDialog({ kind: "addCategory" })}
          >
            <PlusIcon className="size-4" />
            {t("businessCategoriesAddCategoryTitle")}
          </Button>
        }
      />

      <FormNoticeStack
        error={error}
        success={notice}
        onDismissError={() => setError(null)}
        onDismissSuccess={() => setNotice(null)}
        dismissLabel={t("noticeDismiss")}
        size={adminFormNoticeDefaults.size}
        successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
        errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
      />

      {loading ? (
        <AdminCardSkeleton rows={5} />
      ) : categories.length === 0 ? (
        <div
          className={cn(
            adminSectionCardClass,
            "flex flex-col items-center gap-3 px-4 py-12 text-center"
          )}
        >
          <FolderIcon className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("businessCategoriesEmptyBrowse")}</p>
          <Button
            type="button"
            className="h-10 gap-1.5 px-4"
            onClick={() => setDialog({ kind: "addCategory" })}
          >
            <PlusIcon className="size-4" />
            {t("businessCategoriesAddCategoryTitle")}
          </Button>
        </div>
      ) : (
        <div className={cn(adminSectionCardClass, "overflow-hidden")}>
          <div className="border-b border-[#e8e0d8] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block min-w-0 flex-1 sm:max-w-xs">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  className={cn(adminFieldClass, "h-10 pl-9 text-sm")}
                  placeholder={t("businessCategoriesSearchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <span className="text-sm text-muted-foreground">
                {t("businessCategoriesTotalCount").replace("{count}", String(categories.length))}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-[#f0e9e2]">
            {visible.map((category) => {
              const count = category.subcategories.length
              const isOpen = isExpanded(category.id)
              return (
                <CategoryRow
                  key={category.id}
                  category={category}
                  count={count}
                  expanded={isOpen}
                  onToggle={() => toggleExpanded(category.id)}
                  onAddSubs={() => setDialog({ kind: "addSubs", categoryId: category.id })}
                  onRename={() => setDialog({ kind: "renameCategory", categoryId: category.id })}
                  onDelete={() => setDialog({ kind: "deleteCategory", categoryId: category.id })}
                  onDeleteSub={(subId) =>
                    setDialog({ kind: "deleteSub", categoryId: category.id, subId })
                  }
                />
              )
            })}
          </ul>
        </div>
      )}

      {dialog?.kind === "addCategory" ? (
        <AddCategoryDialog
          onSubmit={(name, subs) => addCategory(name, subs)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "addSubs" && current ? (
        <AddSubcategoriesDialog
          categoryLabel={businessCategoryLabel(current)}
          initialNames={dialog.initialNames}
          onSubmit={(names) => addSubcategories(current.id, names)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "renameCategory" && current ? (
        <RenameDialog
          title={t("businessCategoriesRenameCategoryTitle")}
          initialValue={businessCategoryLabel(current)}
          onSubmit={(name) => renameCategory(current.id, name, name)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "deleteCategory" && current ? (
        <ConfirmDialog
          destructive
          busy={busy}
          title={t("businessCategoriesDelete")}
          message={t("businessCategoriesDeleteCategoryMessage").replace(
            "{name}",
            businessCategoryLabel(current)
          )}
          confirmLabel={t("businessCategoriesDelete")}
          onConfirm={() => void confirmDelete()}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "deleteSub" && current ? (
        <ConfirmDialog
          destructive
          busy={busy}
          title={t("businessCategoriesDelete")}
          message={t("businessCategoriesDeleteSubcategoryMessage").replace(
            "{name}",
            businessCategoryLabel(current.subcategories.find((sub) => sub.id === dialog.subId)!)
          )}
          confirmLabel={t("businessCategoriesDelete")}
          onConfirm={() => void confirmDelete()}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  )
}

function CategoryRow({
  category,
  count,
  expanded,
  onToggle,
  onAddSubs,
  onRename,
  onDelete,
  onDeleteSub,
}: {
  category: BusinessCategory
  count: number
  expanded: boolean
  onToggle: () => void
  onAddSubs: () => void
  onRename: () => void
  onDelete: () => void
  onDeleteSub: (subId: string) => void
}) {
  const { t } = useLanguage()
  const label = businessCategoryLabel(category)

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left hover:bg-[#faf8f6]"
        >
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !expanded && "-rotate-90"
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#eee7df]" aria-hidden>
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width: `${count > 0 ? 100 : 0}%` }}
              />
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                count > 0 ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {count}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onAddSubs}
          >
            <PlusIcon className="size-3.5" />
            {t("businessCategoriesAddSubLabel")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            title={t("businessCategoriesRename")}
            aria-label={`${t("businessCategoriesRename")} — ${label}`}
            onClick={onRename}
          >
            <PencilIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-red-600"
            title={t("businessCategoriesDelete")}
            aria-label={`${t("businessCategoriesDelete")} — ${label}`}
            onClick={onDelete}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#f0e9e2] bg-[#faf8f6] px-4 py-3 sm:px-5">
          {category.subcategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("businessCategoriesNoSubs")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {category.subcategories.map((sub) => (
                <SubcategoryPill
                  key={sub.id}
                  stableKey={sub.id}
                  size="summary"
                  label={businessCategoryLabel(sub)}
                  removeLabel={`${t("businessCategoriesDelete")} — ${businessCategoryLabel(sub)}`}
                  onRemove={() => onDeleteSub(sub.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </li>
  )
}
