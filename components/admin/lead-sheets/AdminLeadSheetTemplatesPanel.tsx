"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { CopyIcon, Loader2Icon, PlusIcon, SearchIcon, StarIcon, Trash2Icon } from "lucide-react"

import {
  adminFieldClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { TemplateAssignedIndustryPills } from "@/components/admin/lead-sheets/TemplateAssignedIndustryPills"
import { NewTemplateDialog } from "@/components/admin/lead-sheets/NewTemplateDialog"
import { AdminListSkeleton } from "@/components/admin/AdminListSkeleton"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import {
  getLeadSheetsTemplatesCache,
  invalidateLeadSheetsTemplatesCache,
  setLeadSheetsTemplatesCache,
} from "@/lib/data/lead-sheets-hub-cache"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { LeadSheetTemplateSummary, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useLeadSheetsHubCategories } from "@/hooks/useLeadSheetsHubCategories"
import { cn } from "cn"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { useKeyedState } from "@/lib/react/use-keyed-state"

const TEMPLATE_PAGE_SIZE = 10

export function AdminLeadSheetTemplatesPanel() {
  const { t } = useLanguage()
  const router = useRouter()
  const { categories, loading: categoriesLoading } = useLeadSheetsHubCategories()
  const [chosenCategoryId, setCategoryFilterId] = useState<string>("")
  // A chosen industry that no longer exists is treated as "all categories".
  const categoryFilterId =
    chosenCategoryId &&
    (categories.length === 0 || categories.some((c) => c.id === chosenCategoryId))
      ? chosenCategoryId
      : ""
  const [templates, setTemplates] = useState<LeadSheetTemplateSummary[]>(() => {
    return getLeadSheetsTemplatesCache("") ?? []
  })
  const [initialLoading, setInitialLoading] = useState(
    () => getLeadSheetsTemplatesCache("") === null
  )
  const [listRefreshing, setListRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [dupName, setDupName] = useState("")
  const [search, setSearch] = useState("")
  // Back to page 1 whenever the search or the industry filter changes.
  const [page, setPage] = useKeyedState(1, `${search}|${categoryFilterId}`)

  const categoryFilterTriggerLabel = useMemo(() => {
    if (!categoryFilterId) return t("leadSheetsFilterAllCategories")
    const cat = categories.find((c) => c.id === categoryFilterId)
    return cat ? businessCategoryLabel(cat) : t("leadSheetsFilterAllCategories")
  }, [categories, categoryFilterId, t])

  const loadTemplates = useCallback(
    async (options?: { silent?: boolean }) => {
      const cached = getLeadSheetsTemplatesCache("")
      const silent = options?.silent ?? cached !== null

      if (!silent) {
        setInitialLoading(true)
        setError(null)
      } else {
        setListRefreshing(true)
      }

      try {
        const res = await fetch("/api/admin/lead-sheet-templates?sharedOnly=1")
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as { templates: LeadSheetTemplateSummary[] }
        const next = data.templates ?? []
        setLeadSheetsTemplatesCache("", next)
        setTemplates(next)
      } catch {
        if (!silent) setError(t("leadSheetsLoadError"))
      } finally {
        setInitialLoading(false)
        setListRefreshing(false)
      }
    },
    [t]
  )

  useAsyncEffect(() => {
    // `templates` already starts from the cache; refresh quietly when there is one.
    void loadTemplates({ silent: getLeadSheetsTemplatesCache("") !== null })
  }, [loadTemplates])

  const filteredTemplates = useMemo(() => {
    let list = templates
    if (categoryFilterId) {
      list = list.filter((tpl) => {
        if (tpl.isSystemDefault) return true
        if (tpl.categoryIds.length === 0) return true
        return tpl.categoryIds.includes(categoryFilterId)
      })
    }
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((tpl) => tpl.name.toLowerCase().includes(q))
  }, [templates, search, categoryFilterId])

  const industryFilterActive = Boolean(categoryFilterId)

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleTemplates =
    filteredTemplates.length <= TEMPLATE_PAGE_SIZE
      ? filteredTemplates
      : filteredTemplates.slice((safePage - 1) * TEMPLATE_PAGE_SIZE, safePage * TEMPLATE_PAGE_SIZE)
  const showPagination = filteredTemplates.length > TEMPLATE_PAGE_SIZE

  /** Returns an error message for the popup, or `null` once the new template is open. */
  async function createTemplate(input: {
    name: string
    sourceId: string | null
  }): Promise<string | null> {
    try {
      // A copy of the chosen template (Standard by default); without one, an empty sheet.
      const res = input.sourceId
        ? await fetch(`/api/admin/lead-sheet-templates/${input.sourceId}/duplicate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: input.name, isShared: true }),
          })
        : await fetch("/api/admin/lead-sheet-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: input.name }),
          })
      if (!res.ok) throw new Error("create")
      const data = (await res.json()) as ResolvedLeadSheetConfig
      invalidateLeadSheetsTemplatesCache()
      const newId = data.template?.id
      if (newId) {
        router.push(`/admin/lead-sheets/templates/${newId}`)
      } else {
        setShowCreate(false)
        await loadTemplates({ silent: false })
      }
      return null
    } catch {
      return t("leadSheetsLoadError")
    }
  }

  async function duplicateTemplate() {
    if (!duplicateId || !dupName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/lead-sheet-templates/${duplicateId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dupName.trim(), isShared: true }),
      })
      if (!res.ok) throw new Error("dup")
      const data = (await res.json()) as ResolvedLeadSheetConfig
      setDuplicateId(null)
      setDupName("")
      invalidateLeadSheetsTemplatesCache()
      if (data.template?.id) {
        router.push(`/admin/lead-sheets/templates/${data.template.id}`)
      } else await loadTemplates({ silent: true })
    } catch {
      setError(t("leadSheetsLoadError"))
    } finally {
      setCreating(false)
    }
  }

  async function deleteTemplate(id: string, isDefault: boolean) {
    if (isDefault) return
    const inUse = templates.find((tpl) => tpl.id === id)?.clientCount ?? 0
    const question =
      inUse > 0
        ? `${t("leadSheetsDeleteTemplate")}\n\n${t("leadSheetsDeleteTemplateInUse").replace("{count}", String(inUse))}`
        : t("leadSheetsDeleteTemplate")
    if (!window.confirm(question)) return
    const res = await fetch(`/api/admin/lead-sheet-templates/${id}`, { method: "DELETE" })
    if (!res.ok) {
      setError(t("leadSheetsLoadError"))
      return
    }
    setNotice(t("leadSheetAssignmentSaved"))
    invalidateLeadSheetsTemplatesCache()
    setTemplates((current) => current.filter((tpl) => tpl.id !== id))
  }

  const showListSkeleton = initialLoading && templates.length === 0

  return (
    <div className="space-y-4">
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(adminFieldClass, "pl-10")}
            placeholder={t("leadSheetsTemplatesSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <Select
          value={categoryFilterId || "__all__"}
          onValueChange={(v) => {
            const raw = v == null ? "__all__" : String(v)
            setCategoryFilterId(raw !== "__all__" ? raw : "")
          }}
          disabled={categoriesLoading && categories.length === 0}
        >
          <SelectTrigger
            className={cn(
              adminOutlineButtonClass,
              "h-11 w-full gap-2 rounded-xl px-3 text-[15px] lg:w-72",
              "[&_[data-slot=select-value]]:truncate"
            )}
          >
            <SelectValue placeholder={t("leadSheetsFilterAllCategories")}>
              {categoryFilterTriggerLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            alignItemWithTrigger={false}
            className="rounded-xl p-1"
            style={{
              width: "auto",
              minWidth: "max(var(--anchor-width), 18rem)",
              maxWidth: "calc(100vw - 2rem)",
            }}
          >
            <SelectItem value="__all__" className="py-2 pl-2.5 text-[15px]">
              {t("leadSheetsFilterAllCategories")}
            </SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} className="py-2 pl-2.5 text-[15px]">
                {businessCategoryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" className="h-11 shrink-0 px-4" onClick={() => setShowCreate(true)}>
          <PlusIcon className="size-4" aria-hidden />
          {t("leadSheetsNewTemplate")}
        </Button>
      </div>

      {showCreate ? (
        <NewTemplateDialog
          templates={templates}
          onCreate={createTemplate}
          onClose={() => setShowCreate(false)}
        />
      ) : null}

      {duplicateId ? (
        <div className={cn(adminSectionCardClass, "space-y-3 p-4")}>
          <p className="text-sm font-semibold">{t("leadSheetsDuplicate")}</p>
          <input
            className={adminFieldClass}
            placeholder={t("leadSheetsDuplicateName")}
            value={dupName}
            onChange={(e) => setDupName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setDuplicateId(null)}>
              {t("leadSheetCancel")}
            </Button>
            <Button type="button" disabled={creating} onClick={() => void duplicateTemplate()}>
              {t("leadSheetsDuplicate")}
            </Button>
          </div>
        </div>
      ) : null}

      {showListSkeleton ? (
        <>
          <p className="sr-only">{t("leadSheetsLoading")}</p>
          <AdminListSkeleton rows={5} />
        </>
      ) : null}

      {!showListSkeleton && templates.length > 0 && filteredTemplates.length === 0 ? (
        <p
          className={cn(
            adminSectionCardClass,
            "px-4 py-8 text-center text-sm text-muted-foreground"
          )}
        >
          {search.trim()
            ? t("leadSheetsTemplatesSearchEmpty")
            : industryFilterActive
              ? t("leadSheetsTemplatesFilterEmpty")
              : t("leadSheetsTemplatesSearchEmpty")}
        </p>
      ) : null}

      {!showListSkeleton && templates.length === 0 && !listRefreshing ? (
        <p
          className={cn(
            adminSectionCardClass,
            "px-4 py-8 text-center text-sm text-muted-foreground"
          )}
        >
          {t("leadSheetsEmptyTemplates")}
        </p>
      ) : null}

      {!showListSkeleton && (filteredTemplates.length > 0 || listRefreshing) ? (
        <div className="relative space-y-2">
          {listRefreshing ? (
            <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-[#fffcf9]/70 pt-8">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden />
              <span className="sr-only">{t("leadSheetsLoading")}</span>
            </div>
          ) : null}
          <ul className={cn("space-y-2", listRefreshing && "pointer-events-none opacity-60")}>
            {visibleTemplates.map((tpl) => (
              <li
                key={tpl.id}
                className={cn(
                  adminSectionCardClass,
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">{tpl.name}</p>
                    {tpl.isSystemDefault ? (
                      <span
                        className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                        title={t("leadSheetsDefaultCannotDelete")}
                      >
                        <StarIcon className="size-3" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <TemplateAssignedIndustryPills
                      categoryIds={tpl.categoryIds ?? []}
                      categories={categories}
                    />
                    <span>
                      {t("leadSheetsFieldCount").replace("{count}", String(tpl.columnCount ?? 0))}
                    </span>
                    {tpl.clientCount !== undefined ? (
                      <span>
                        {t("leadSheetsUsageCount").replace("{count}", String(tpl.clientCount))}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/lead-sheets/templates/${tpl.id}?preview=1`}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
                      adminOutlineButtonClass
                    )}
                  >
                    {t("leadSheetsPreview")}
                  </Link>
                  <Link
                    href={`/admin/lead-sheets/templates/${tpl.id}`}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
                      adminOutlineButtonClass
                    )}
                  >
                    {t("leadSheetsEditTemplate")}
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className={adminOutlineButtonClass}
                    onClick={() => {
                      setDuplicateId(tpl.id)
                      setDupName(`${tpl.name} (copy)`)
                    }}
                  >
                    <CopyIcon className="size-4" />
                    {t("leadSheetsDuplicate")}
                  </Button>
                  {tpl.isSystemDefault ? (
                    // Placeholder keeps actions aligned with other rows; the crossed-out bin
                    // signals the standard template can't be deleted.
                    <span title={t("leadSheetsDefaultCannotDelete")} className="inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled
                        aria-label={t("leadSheetsDefaultCannotDelete")}
                        className="relative"
                      >
                        <Trash2Icon className="size-4" />
                        <span
                          aria-hidden
                          className="absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current"
                        />
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("leadSheetsDeleteTemplateConfirm")}
                      onClick={() => void deleteTemplate(tpl.id, tpl.isSystemDefault)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {showPagination ? (
            <div
              className={cn(
                adminSectionCardClass,
                "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              )}
            >
              <p className="text-xs text-muted-foreground">
                {t("leadSheetsTemplatesPaginationSummary")
                  .replace("{from}", String((safePage - 1) * TEMPLATE_PAGE_SIZE + 1))
                  .replace(
                    "{to}",
                    String(Math.min(safePage * TEMPLATE_PAGE_SIZE, filteredTemplates.length))
                  )
                  .replace("{total}", String(filteredTemplates.length))}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={adminOutlineButtonClass}
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                >
                  {t("businessCategoriesPaginationPrev")}
                </Button>
                <span className="text-xs font-medium tabular-nums">
                  {t("businessCategoriesPaginationPage")
                    .replace("{page}", String(safePage))
                    .replace("{pages}", String(totalPages))}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className={adminOutlineButtonClass}
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                >
                  {t("businessCategoriesPaginationNext")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
