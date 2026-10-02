"use client"

import { Suspense, useMemo, useState } from "react"
import { ChevronDownIcon, Loader2Icon, PlusIcon, SearchIcon, WrenchIcon, XIcon } from "lucide-react"

import { adminFieldClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { mergeNames, NamesChipInput } from "@/components/admin/business-categories/NamesChipInput"
import { AdminPageIntro } from "@/components/admin/AdminPageIntro"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ModalShell } from "@/components/admin/ModalShell"
import { ServiceNameDialog } from "@/components/admin/services/ServiceDialogs"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { AdminCardSkeleton } from "@/components/admin/AdminListSkeleton"
import { useLeadSheetsHubCategories } from "@/hooks/useLeadSheetsHubCategories"
import { useServiceLibrary, type LibraryService } from "@/hooks/useServiceLibrary"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import { serviceName, type Service } from "@/lib/services/types"
import { cn } from "cn"

const UNSORTED = "unsorted"

type Category = { id: string; nameDa: string; nameEn: string }
type Dialog = { kind: "rename"; id: string } | { kind: "delete"; id: string }

function fold(value: string) {
  return value.trim().toLocaleLowerCase()
}

/** Services page: one board, categories as rows, services as chips inside. */
export function AdminServicesHub() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <HubContent />
    </Suspense>
  )
}

function HubSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5" aria-busy="true">
      <AdminCardSkeleton rows={5} />
    </div>
  )
}

function HubContent() {
  const { t, locale } = useLanguage()
  const { categories, loading: categoriesLoading } = useLeadSheetsHubCategories()
  const { services, setServices, loading, error, setError } = useServiceLibrary()
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const countIn = (categoryId: string) =>
    services.filter((service) => service.categoryIds.includes(categoryId)).length

  const needle = fold(search)
  const matches = (service: LibraryService) =>
    !needle || fold(service.nameDa).includes(needle) || fold(service.nameEn).includes(needle)

  const visibleCategories = categories.filter((category) => {
    if (!needle) return true
    return (
      fold(category.nameDa).includes(needle) ||
      fold(category.nameEn).includes(needle) ||
      services.some((s) => s.categoryIds.includes(category.id) && matches(s))
    )
  })
  const unsorted = services.filter((service) => service.categoryIds.length === 0)
  const visibleUnsorted = unsorted.filter(matches)

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function patchService(id: string, patch: (service: LibraryService) => LibraryService) {
    setServices((current) =>
      current.map((service) => (service.id === id ? patch(service) : service))
    )
  }

  async function addNew(categoryId: string, name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/business-categories/${categoryId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameDa: name }),
      })
      if (!res.ok) throw new Error("save")
      const { service } = (await res.json()) as { service: Service }
      setServices((current) => [
        ...current,
        { ...service, categoryIds: [categoryId], clientCount: 0 },
      ])
      return true
    } catch {
      setError(t("servicesSaveError"))
      return false
    }
  }

  function isInCategory(categoryId: string, name: string, list = services) {
    const key = fold(name)
    return list.some(
      (service) =>
        service.categoryIds.includes(categoryId) &&
        (fold(service.nameDa) === key || fold(service.nameEn) === key)
    )
  }

  /** Creates new services in this category only; skips names already in the same category. */
  async function addMany(categoryId: string, names: string[]): Promise<string | null> {
    const pending = names.map((n) => n.trim()).filter(Boolean)
    if (pending.length === 0) return null

    const onlyDupes = pending.every((name) => isInCategory(categoryId, name))
    if (onlyDupes) {
      return t("servicesAlreadyHere").replace("{name}", pending[0]!)
    }

    const addedKeys = new Set<string>()
    for (const name of pending) {
      const key = fold(name)
      if (addedKeys.has(key) || isInCategory(categoryId, name)) continue
      addedKeys.add(key)
      const ok = await addNew(categoryId, name)
      if (!ok) return t("servicesSaveError")
    }
    setNotice(t("servicesSaved"))
    setExpanded((current) => new Set(current).add(categoryId))
    return null
  }

  async function rename(id: string, nameDa: string, nameEn: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameDa, nameEn }),
      })
      if (!res.ok) return t("servicesSaveError")
      const { service } = (await res.json()) as { service: Service }
      patchService(id, (s) => ({ ...s, ...service }))
      setNotice(t("servicesSaved"))
      setDialog(null)
      return null
    } catch {
      return t("servicesSaveError")
    }
  }

  const current = dialog !== null ? services.find((service) => service.id === dialog.id) : undefined

  async function confirmDelete() {
    if (!current) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/services/${current.id}`, { method: "DELETE" })
      if (res.status === 409) {
        const data = (await res.json()) as { leadCount?: number }
        setError(t("servicesInUse").replace("{count}", String(data.leadCount ?? 0)))
      } else if (!res.ok) {
        setError(t("servicesSaveError"))
      } else {
        setServices((list) => list.filter((service) => service.id !== current.id))
        setNotice(t("servicesDeleted"))
      }
    } catch {
      setError(t("servicesSaveError"))
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const ready = !loading && !categoriesLoading
  const totalServices = services.length

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <AdminPageIntro
        title={t("servicesHubTitle")}
        description={t("servicesHubIntro")}
        icon={<WrenchIcon className="size-5" />}
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

      {!ready ? (
        <div className="space-y-3" aria-busy="true">
          <p className="sr-only">{t("leadSheetsLoading")}</p>
          <AdminCardSkeleton rows={5} />
        </div>
      ) : categories.length === 0 && unsorted.length === 0 ? (
        <p
          className={cn(
            adminSectionCardClass,
            "px-4 py-10 text-center text-sm text-muted-foreground"
          )}
        >
          {t("serviceSetsNoCategories")}
        </p>
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
                  placeholder={t("servicesSearchAll")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <span className="text-sm text-muted-foreground">
                {t("servicesTotalCount").replace("{count}", String(totalServices))}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-[#f0e9e2]">
            {visibleCategories.map((category) => {
              const count = countIn(category.id)
              const isExpanded = expanded.has(category.id) || Boolean(needle)
              const inCategory = services.filter(
                (service) => service.categoryIds.includes(category.id) && matches(service)
              )
              return (
                <CategoryRow
                  key={category.id}
                  category={category}
                  count={count}
                  expanded={isExpanded}
                  services={inCategory}
                  onToggle={() => toggleExpanded(category.id)}
                  onAddMany={(names) => addMany(category.id, names)}
                  onDelete={(service) => setDialog({ kind: "delete", id: service.id })}
                />
              )
            })}
            {unsorted.length > 0 ? (
              <CategoryRow
                unsorted
                category={{
                  id: UNSORTED,
                  nameDa: t("servicesUnsorted"),
                  nameEn: t("servicesUnsorted"),
                }}
                count={unsorted.length}
                expanded={expanded.has(UNSORTED) || Boolean(needle)}
                services={visibleUnsorted}
                onToggle={() => toggleExpanded(UNSORTED)}
                onDelete={(service) => setDialog({ kind: "delete", id: service.id })}
              />
            ) : null}
          </ul>
        </div>
      )}

      {dialog?.kind === "rename" && current ? (
        <ServiceNameDialog
          key={current.id}
          title={t("servicesEditTitle")}
          submitLabel={t("businessCategoriesSave")}
          initialDa={current.nameDa}
          initialEn={current.nameEn === current.nameDa ? "" : current.nameEn}
          onSubmit={(da, en) => rename(current.id, da, en)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" && current ? (
        <ConfirmDialog
          destructive
          busy={busy}
          title={t("servicesDeleteTitle")}
          message={[
            t("servicesDeleteMessage").replace("{name}", serviceName(current, locale)),
            current.clientCount > 0
              ? t("servicesDeleteClients").replace("{count}", String(current.clientCount))
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
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
  services,
  unsorted = false,
  onToggle,
  onAddMany,
  onDelete,
}: {
  category: Category
  count: number
  expanded: boolean
  services: LibraryService[]
  unsorted?: boolean
  onToggle: () => void
  onAddMany?: (names: string[]) => Promise<string | null>
  onDelete: (service: LibraryService) => void
}) {
  const { t } = useLanguage()
  const label = unsorted ? t("servicesUnsorted") : businessCategoryLabel(category)
  const [dialogOpen, setDialogOpen] = useState(false)
  const inCategory = services

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
        {!unsorted ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setDialogOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            {t("servicesAddService")}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-[#f0e9e2] bg-[#faf8f6] px-4 py-3 sm:px-5">
          {inCategory.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <PlusIcon className="size-4" aria-hidden />
              {t("servicesCategoryEmpty").replace("{category}", label)}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {inCategory.map((service) => (
                  <ServiceChip
                    key={service.id}
                    service={service}
                    onDelete={() => onDelete(service)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {dialogOpen && onAddMany ? (
        <AddServiceDialog
          categoryLabel={label}
          inCategory={inCategory}
          onSubmit={onAddMany}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </li>
  )
}

function AddServiceDialog({
  categoryLabel,
  inCategory,
  onSubmit,
  onClose,
}: {
  categoryLabel: string
  inCategory: LibraryService[]
  onSubmit: (names: string[]) => Promise<string | null>
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [names, setNames] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const all = mergeNames(names, draft)
  const duplicateInCategory = (name: string) =>
    inCategory.some(
      (service) => fold(service.nameDa) === fold(name) || fold(service.nameEn) === fold(name)
    )
  const creatable = all.filter((name) => !duplicateInCategory(name))
  const blocked = all.filter((name) => duplicateInCategory(name))
  const canSubmit = creatable.length > 0 && !saving

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    const message = await onSubmit(all)
    if (message) {
      setError(message)
      setSaving(false)
      return
    }
    onClose()
  }

  return (
    <ModalShell
      title={t("servicesAddTo").replace("{category}", categoryLabel)}
      size="sm"
      onClose={onClose}
      dismissible={names.length === 0 && !draft.trim()}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {creatable.length > 1
              ? t("businessCategoriesAddCount").replace("{count}", String(creatable.length))
              : t("servicesAddAction")}
          </Button>
        </>
      }
    >
      <NamesChipInput
        names={names}
        onChange={setNames}
        draft={draft}
        onDraftChange={setDraft}
        disabled={saving}
        autoFocus
      />

      {blocked.length > 0 && creatable.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("servicesAlreadyHere").replace("{name}", blocked[0]!)}
        </p>
      ) : null}

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

function ServiceChip({ service, onDelete }: { service: LibraryService; onDelete: () => void }) {
  const { t, locale } = useLanguage()
  const name = serviceName(service, locale)
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#e2d6ca] bg-white py-1 pr-1 pl-3 text-sm">
      <span className="truncate font-medium">{name}</span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6 shrink-0 text-muted-foreground hover:text-red-600"
        title={t("servicesDeleteEverywhere")}
        aria-label={`${t("servicesDeleteEverywhere")} — ${name}`}
        onClick={onDelete}
      >
        <XIcon className="size-3.5" />
      </Button>
    </span>
  )
}
