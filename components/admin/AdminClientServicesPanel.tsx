"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminFieldClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { Skeleton } from "@/components/ui/skeleton"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { SERVICE_NAME_MAX, serviceName, type Service } from "@/lib/services/types"
import { defaultRank, sortByDefaultRank } from "@/lib/services/resolve"
import { cn } from "cn"

type ClientCategory = {
  id: string
  nameDa: string
  nameEn: string
  assigned: boolean
  serviceIds: string[]
}

type ClientServicesData = {
  catalog: Service[]
  manual: Service[]
  categories: ClientCategory[]
  selectedIds: string[]
  customOrder: boolean
}

type NewManual = { key: string; name: string }
type Group = { id: string; label: string; services: Service[] }
type Kind = "mine" | "other" | "manual"

/** The selection is an ordered list of service ids; a manual service not saved yet is `new:<key>`. */
const NEW_PREFIX = "new:"
const isNewToken = (token: string) => token.startsWith(NEW_PREFIX)

/** One colour per source, so a pill tells you where the service comes from at a glance. */
const TONES: Record<
  Kind,
  {
    dot: string
    pill: string
    pillNew: string
    tick: string
    row: string
    underline: string
    count: string
    link: string
  }
> = {
  mine: {
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-900",
    pillNew: "border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300",
    tick: "border-emerald-500 bg-emerald-500 text-white",
    row: "bg-emerald-50/70",
    underline: "border-emerald-500",
    count: "text-emerald-700",
    link: "text-emerald-700",
  },
  other: {
    dot: "bg-blue-500",
    pill: "border-blue-200 bg-blue-50 text-blue-900",
    pillNew: "border-blue-300 bg-blue-50 text-blue-900 ring-1 ring-blue-300",
    tick: "border-blue-500 bg-blue-500 text-white",
    row: "bg-blue-50/70",
    underline: "border-blue-500",
    count: "text-blue-700",
    link: "text-blue-700",
  },
  manual: {
    dot: "bg-rose-500",
    pill: "border-rose-200 bg-rose-50 text-rose-900",
    pillNew: "border-rose-300 bg-rose-50 text-rose-900 ring-1 ring-rose-300",
    tick: "border-rose-500 bg-rose-500 text-white",
    row: "bg-rose-50/70",
    underline: "border-rose-500",
    count: "text-rose-700",
    link: "text-rose-700",
  },
}

/** The lists, tabs and form below the pills use the brand colour. */
const BRAND: (typeof TONES)[Kind] = {
  dot: "bg-primary",
  pill: "",
  pillNew: "",
  tick: "border-primary bg-primary text-white",
  row: "bg-primary/[0.08]",
  underline: "border-primary",
  count: "text-primary",
  link: "text-primary",
}

function fold(value: string) {
  return value.trim().toLocaleLowerCase()
}

/**
 * Pick the services a client offers. Selected services are coloured pills on top; below, three
 * tabs (the client's categories, other categories, manual) list what can be ticked. One Save.
 */
export function AdminClientServicesPanel() {
  const { slug } = useAdminClient()
  const { t, locale } = useLanguage()
  const [data, setData] = useState<ClientServicesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [items, setItems] = useState<string[]>([])
  const [customOrder, setCustomOrder] = useState(false)
  const [newManual, setNewManual] = useState<NewManual[]>([])
  const [removedManual, setRemovedManual] = useState<string[]>([])
  const [sessionNew, setSessionNew] = useState<Set<string>>(new Set())

  const [tab, setTab] = useState<Kind>("mine")
  const [allCollapsed, setAllCollapsed] = useState(false)
  const [query, setQuery] = useState("")
  const [manualDraft, setManualDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [moreBelow, setMoreBelow] = useState(false)

  const updateMore = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  const reset = useCallback((next: ClientServicesData) => {
    setData(next)
    setItems(next.selectedIds)
    setCustomOrder(next.customOrder)
    setNewManual([])
    setRemovedManual([])
    setSessionNew(new Set())
  }, [])

  const load = useCallback(async () => {
    if (!slug) return
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/services`)
      if (!res.ok) throw new Error("load")
      reset((await res.json()) as ClientServicesData)
      setError(null)
    } catch {
      setError(t("servicesLoadError"))
    } finally {
      setLoading(false)
    }
  }, [slug, t, reset])

  useAsyncEffect(() => {
    void load()
  }, [load])

  const baseline = useMemo(() => new Set(data?.selectedIds ?? []), [data])
  const selected = useMemo(() => items.filter((item) => !isNewToken(item)), [items])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const kindOf = useMemo(() => {
    const mine = new Set(
      (data?.categories ?? []).filter((c) => c.assigned).flatMap((c) => c.serviceIds)
    )
    const manual = new Set((data?.manual ?? []).map((s) => s.id))
    return (token: string): Kind =>
      isNewToken(token) || manual.has(token) ? "manual" : mine.has(token) ? "mine" : "other"
  }, [data])
  /** Default order (categories, other, manual) until an admin drags something. */
  const displayItems = useMemo(
    () => (customOrder ? items : sortByDefaultRank(items, (token) => defaultRank(kindOf(token)))),
    [items, customOrder, kindOf]
  )
  const reordered = useMemo(() => {
    if (customOrder !== (data?.customOrder ?? false)) return true
    const before = (data?.selectedIds ?? []).filter((id) => selectedSet.has(id))
    const now = displayItems.filter((id) => !isNewToken(id) && baseline.has(id))
    return before.some((id, index) => id !== now[index])
  }, [customOrder, data, selectedSet, displayItems, baseline])
  const changeCount =
    selected.filter((id) => !baseline.has(id)).length +
    [...baseline].filter((id) => !selectedSet.has(id)).length +
    newManual.length +
    removedManual.length +
    (reordered ? 1 : 0)
  const dirty = changeCount > 0

  const ready = Boolean(data)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !ready) return
    const observer = new ResizeObserver(updateMore)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [ready, updateMore])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function toggle(id: string) {
    setItems((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function clearAll() {
    setItems([])
    setNewManual([])
    setRemovedManual(data?.manual.map((service) => service.id) ?? [])
    setCustomOrder(false)
  }

  function setMany(ids: string[], on: boolean) {
    setItems((current) =>
      on
        ? [...current, ...ids.filter((id) => !current.includes(id))]
        : current.filter((item) => !ids.includes(item))
    )
  }

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customOrder,
          order: displayItems.flatMap((token) => {
            if (!isNewToken(token)) return [token]
            const pending = newManual.find((item) => item.key === token.slice(NEW_PREFIX.length))
            return pending ? [`${NEW_PREFIX}${pending.name}`] : []
          }),
          removedManualIds: removedManual,
        }),
      })
      if (res.status === 409) {
        setError(t("clientServicesManualInUse"))
        return
      }
      if (!res.ok) throw new Error("save")
      const next = (await res.json()) as ClientServicesData
      const added = new Set(next.selectedIds.filter((id) => !baseline.has(id)))
      const allServices = new Map(
        [...(data?.catalog ?? []), ...(data?.manual ?? [])].map((s) => [s.id, s])
      )
      const removedNames = [...baseline]
        .filter((id) => !next.selectedIds.includes(id))
        .map((id) => allServices.get(id))
        .filter(Boolean)
        .map((s) => serviceName(s!, locale))
      reset(next)
      setSessionNew(added)
      setNotice(
        removedNames.length > 0
          ? t("clientServicesSavedRemoved").replace("{names}", removedNames.join(", "))
          : t("clientServicesSavedNotice").replace("{count}", String(next.selectedIds.length))
      )
    } catch {
      setError(t("servicesSaveError"))
    } finally {
      setSaving(false)
    }
  }

  const notices = (
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
  )

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{t("clientServicesTitle")}</h2>
        {notices}
        {loading ? (
          <div className={cn(adminSectionCardClass, "space-y-4 p-5")} aria-busy="true">
            <p className="sr-only">{t("leadSheetsLoading")}</p>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : null}
      </div>
    )
  }

  const keptManual = data.manual.filter((service) => !removedManual.includes(service.id))
  const byId = new Map(data.catalog.map((service) => [service.id, service]))
  const categoryName = new Map(
    data.categories.map((category) => [category.id, businessCategoryLabel(category)])
  )
  const toGroup = (category: ClientCategory): Group => ({
    id: category.id,
    label: categoryName.get(category.id) ?? "",
    services: category.serviceIds.flatMap((id) => byId.get(id) ?? []),
  })

  const mineGroups = data.categories.filter((category) => category.assigned).map(toGroup)
  const mineIds = new Set(mineGroups.flatMap((group) => group.services.map((s) => s.id)))
  const linked = new Set(data.categories.flatMap((category) => category.serviceIds))
  const otherGroups = data.categories
    .filter((category) => !category.assigned)
    .map(toGroup)
    .map((group) => ({ ...group, services: group.services.filter((s) => !mineIds.has(s.id)) }))
    .filter((group) => group.services.length > 0)
  const unsorted = data.catalog.filter((service) => !linked.has(service.id))
  if (unsorted.length > 0) {
    otherGroups.push({ id: "unsorted", label: t("servicesUnsorted"), services: unsorted })
  }
  const categoriesOf = (serviceId: string) =>
    data.categories
      .filter((category) => category.serviceIds.includes(serviceId))
      .map((category) => categoryName.get(category.id) ?? "")

  const needle = fold(query)
  const matches = (service: { nameDa: string; nameEn: string }) =>
    !needle || fold(service.nameDa).includes(needle) || fold(service.nameEn).includes(needle)
  const filterGroups = (groups: Group[]) =>
    groups
      .map((group) => ({ ...group, services: group.services.filter(matches) }))
      .filter((group) => group.services.length > 0)
  const visibleMine = filterGroups(mineGroups)
  const visibleOther = filterGroups(otherGroups)
  const visibleManual = keptManual.filter(matches)
  const visiblePending = newManual.filter((item) => !needle || fold(item.name).includes(needle))
  const searching = Boolean(needle)
  const searchGroups = searching
    ? [
        { id: "mine" as Kind, label: t("clientServicesTabMine"), groups: visibleMine },
        { id: "other" as Kind, label: t("clientServicesTabOther"), groups: visibleOther },
        {
          id: "manual" as Kind,
          label: t("clientServicesTabManual"),
          groups: [
            {
              id: "manual",
              label: t("clientServicesTabManual"),
              services: [
                ...visibleManual,
                ...visiblePending.map((p) => ({
                  id: p.key,
                  slug: p.key,
                  nameDa: p.name,
                  nameEn: p.name,
                  sortIndex: 0,
                })),
              ],
            },
          ].filter((g) => g.services.length > 0),
        },
      ].filter((s) => s.groups.length > 0)
    : []

  const manualNeedle = fold(manualDraft)
  const sameDraft = (service: { nameDa: string; nameEn: string }) =>
    fold(service.nameDa) === manualNeedle || fold(service.nameEn) === manualNeedle
  const draftShared = manualNeedle ? data.catalog.find(sameDraft) : undefined
  const draftManual = manualNeedle
    ? (keptManual.find(sameDraft) ?? newManual.find((item) => fold(item.name) === manualNeedle))
    : undefined

  function removePending(key: string) {
    setNewManual((current) => current.filter((item) => item.key !== key))
    setItems((current) => current.filter((item) => item !== `${NEW_PREFIX}${key}`))
  }

  function addManual() {
    if (!manualNeedle || draftManual) return
    if (draftShared) {
      setMany([draftShared.id], true)
    } else {
      const name = manualDraft.trim().replace(/\s+/g, " ")
      const key = crypto.randomUUID()
      setNewManual((current) => [...current, { key, name }])
      setItems((current) => [...current, `${NEW_PREFIX}${key}`])
    }
    setManualDraft("")
  }

  const serviceById = new Map([...data.catalog, ...keptManual].map((s) => [s.id, s]))
  const pills: PillData[] = displayItems.flatMap((token) => {
    if (isNewToken(token)) {
      const pending = newManual.find((item) => item.key === token.slice(NEW_PREFIX.length))
      return pending
        ? [{ token, kind: "manual" as Kind, label: pending.name, name: pending.name, isNew: true }]
        : []
    }
    const service = serviceById.get(token)
    if (!service) return []
    const kind: Kind = kindOf(token)
    return [
      {
        token,
        kind,
        label: serviceName(service, locale),
        name: serviceName(service, locale),
        isNew: !baseline.has(token) || sessionNew.has(token),
      },
    ]
  })
  const total = pills.length

  const counts: Record<Kind, number> = {
    mine: pills.filter((pill) => pill.kind === "mine").length,
    other: pills.filter((pill) => pill.kind === "other").length,
    manual: pills.filter((pill) => pill.kind === "manual").length,
  }
  const tabTotal =
    tab === "mine"
      ? mineIds.size
      : tab === "other"
        ? new Set(otherGroups.flatMap((group) => group.services.map((s) => s.id))).size
        : keptManual.length + newManual.length
  const tabs: { id: Kind; label: string }[] = [
    { id: "mine", label: t("clientServicesTabMine") },
    { id: "other", label: t("clientServicesTabOther") },
    { id: "manual", label: t("clientServicesTabManual") },
  ]
  const showSearch = true
  const tone: Tone = BRAND
  const listProps = {
    tone,
    selected: selectedSet,
    onToggle: toggle,
    onSetMany: setMany,
    locale,
  }
  const newBadge = t("clientServicesNewBadge")

  return (
    <div className="space-y-4">
      {notices}

      <section className={cn(adminSectionCardClass, "overflow-clip")}>
        <header className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{t("clientServicesTitle")}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {t("clientServicesShownCount").replace("{count}", String(total))}
            </span>
            {total > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("clientServicesClearAll")}
              </button>
            ) : null}
          </div>
        </header>

        <div className="min-h-9 px-3 pb-1 sm:px-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("clientServicesSelectedLabel")}
          </p>
          {total === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">{t("clientServicesNoneSelected")}</p>
          ) : (
            <>
              <SortablePills
                pills={pills}
                newBadge={newBadge}
                removeLabel={t("clientServicesUnselect")}
                onReorder={(tokens) => {
                  setItems(tokens)
                  setCustomOrder(true)
                }}
                onRemove={(token) =>
                  isNewToken(token) ? removePending(token.slice(NEW_PREFIX.length)) : toggle(token)
                }
              />
              {customOrder && total > 1 ? (
                <button
                  type="button"
                  onClick={() => setCustomOrder(false)}
                  className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t("clientServicesResetOrder")}
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4 border-t border-[#e8e0d8] bg-[#faf8f6]">
          <p className="px-3 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-5">
            {t("clientServicesAddFromLabel")}
          </p>
          <div className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-5">
            <div role="tablist" className="flex flex-wrap gap-1">
              {tabs.map((item) => {
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setTab(item.id)
                      scrollRef.current?.scrollTo({ top: 0 })
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
                      active
                        ? "bg-white text-foreground shadow-sm ring-1 ring-[#e8e0d8]"
                        : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
                    )}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {counts[item.id] > 0 ? (
                      <span className={cn("text-xs font-bold", TONES[item.id].count)}>
                        {counts[item.id]}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setAllCollapsed((v) => !v)}
              className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {allCollapsed ? t("clientServicesExpandAll") : t("clientServicesCollapseAll")}
            </button>
          </div>

          <div className="space-y-3 px-3 py-4 sm:px-5">
            <div className="overflow-hidden rounded-xl border border-[#e8e0d8] bg-white shadow-sm focus-within:border-primary/40">
              {tab === "manual" ? (
                <div className="border-b border-[#eee7df] p-3.5">
                  <label htmlFor="client-manual-service" className="text-sm font-medium">
                    {t("clientServicesAddManualTitle")}
                  </label>
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      addManual()
                    }}
                  >
                    <input
                      id="client-manual-service"
                      className={cn(adminFieldClass, "h-11 min-w-0 flex-1")}
                      placeholder={t("clientServicesManualPlaceholder")}
                      value={manualDraft}
                      maxLength={SERVICE_NAME_MAX}
                      onChange={(e) => setManualDraft(e.target.value)}
                    />
                    <Button
                      type="submit"
                      className="h-11 shrink-0 gap-1.5 px-4"
                      disabled={!manualNeedle || Boolean(draftManual)}
                    >
                      <PlusIcon className="size-4" />
                      {draftShared
                        ? t("clientServicesSelectInstead")
                        : t("clientServicesAddService")}
                    </Button>
                  </form>
                  {draftShared ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("clientServicesExistsShared")
                        .replace("{name}", serviceName(draftShared, locale))
                        .replace(
                          "{where}",
                          categoriesOf(draftShared.id).join(", ") || t("servicesUnsorted")
                        )}
                    </p>
                  ) : draftManual ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("clientServicesManualDuplicate")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {showSearch ? (
                <label className="relative block border-b border-[#eee7df]">
                  <SearchIcon
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    className="h-11 w-full bg-transparent pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder={t("clientServicesSearch")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              ) : null}

              <div className="relative">
                <div
                  ref={scrollRef}
                  onScroll={updateMore}
                  className="max-h-[22rem] min-h-[11rem] overflow-y-auto [scrollbar-color:#d3c3b2_transparent] [scrollbar-width:thin]"
                >
                  <div className="p-1.5">
                    {searching ? (
                      searchGroups.length === 0 ? (
                        <EmptyHint text={t("clientServicesSearchEmpty")} />
                      ) : (
                        <div className="space-y-4">
                          {searchGroups.map((section) => (
                            <div key={section.id}>
                              <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {section.label}
                              </p>
                              {section.id === "manual" ? (
                                <ManualList
                                  tone={tone}
                                  services={section.groups[0].services.filter(
                                    (s) => !s.id.startsWith("new:")
                                  )}
                                  pending={section.groups[0].services
                                    .filter((s) => s.id.startsWith("new:"))
                                    .map((s) => ({ key: s.id.slice(4), name: s.nameDa }))}
                                  selected={selectedSet}
                                  locale={locale}
                                  newBadge={newBadge}
                                  onToggle={toggle}
                                  onRemove={(service) => {
                                    setRemovedManual((current) => [...current, service.id])
                                    setItems((current) =>
                                      current.filter((item) => item !== service.id)
                                    )
                                  }}
                                  onRemovePending={removePending}
                                />
                              ) : (
                                <GroupList
                                  groups={section.groups}
                                  {...listProps}
                                  searching
                                  allCollapsed={allCollapsed}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : tab === "mine" ? (
                      mineGroups.length === 0 ? (
                        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                          {t("clientServicesNoIndustries")}{" "}
                          <Link
                            href={adminClientSettingsSectionPath(slug, "industries")}
                            className={cn(
                              "font-medium underline-offset-2 hover:underline",
                              tone.link
                            )}
                          >
                            {t("clientServicesGoIndustries")}
                          </Link>
                        </p>
                      ) : visibleMine.length === 0 ? (
                        <EmptyHint text={t("clientServicesSearchEmpty")} />
                      ) : (
                        <GroupList
                          groups={visibleMine}
                          {...listProps}
                          searching={Boolean(needle)}
                          allCollapsed={allCollapsed}
                        />
                      )
                    ) : null}

                    {tab === "other" ? (
                      visibleOther.length === 0 ? (
                        <EmptyHint text={t("clientServicesSearchEmpty")} />
                      ) : (
                        <GroupList
                          groups={visibleOther}
                          {...listProps}
                          searching={Boolean(needle)}
                          allCollapsed={allCollapsed}
                        />
                      )
                    ) : null}

                    {tab === "manual" ? (
                      keptManual.length === 0 && newManual.length === 0 ? (
                        <EmptyHint text={t("clientServicesManualEmptyHint")} />
                      ) : visibleManual.length === 0 && visiblePending.length === 0 ? (
                        <EmptyHint text={t("clientServicesSearchEmpty")} />
                      ) : (
                        <ManualList
                          tone={tone}
                          services={visibleManual}
                          pending={visiblePending}
                          selected={selectedSet}
                          locale={locale}
                          newBadge={newBadge}
                          onToggle={toggle}
                          onRemove={(service) => {
                            setRemovedManual((current) => [...current, service.id])
                            setItems((current) => current.filter((item) => item !== service.id))
                          }}
                          onRemovePending={removePending}
                        />
                      )
                    ) : null}
                  </div>
                </div>
                {moreBelow ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
                ) : null}
              </div>

              {tabTotal > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#eee7df] bg-[#faf8f6] px-3.5 py-2 text-xs">
                  <span className={cn("font-semibold", TONES[tab].count)}>
                    {t("clientServicesTickedOf")
                      .replace("{count}", String(counts[tab]))
                      .replace("{total}", String(tabTotal))}
                  </span>
                  {moreBelow ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ChevronDownIcon className="size-3.5" aria-hidden />
                      {t("clientServicesScrollMore")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {dirty ? (
          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e0d8] bg-[#fffcf9]/95 px-4 py-3 backdrop-blur sm:px-5">
            <p className="text-sm text-muted-foreground">
              {(changeCount === 1
                ? t("clientServicesChangeOne")
                : t("clientServicesChanges")
              ).replace("{count}", String(changeCount))}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => reset(data)}>
                {t("clientServicesDiscard")}
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {t("clientServicesSave")}
              </Button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

type Tone = (typeof TONES)[Kind]

function EmptyHint({ text }: { text: string }) {
  return <p className="px-2 py-8 text-center text-sm text-muted-foreground">{text}</p>
}

function Tick({ state, tone }: { state: "on" | "some" | "off"; tone: Tone }) {
  return (
    <span
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border",
        state === "off" ? "border-[#d3c3b2] bg-white" : tone.tick
      )}
      aria-hidden
    >
      {state === "on" ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
      {state === "some" ? <MinusIcon className="size-3" strokeWidth={3} /> : null}
    </span>
  )
}

type PillData = { token: string; kind: Kind; label: string; name: string; isNew: boolean }

function SortablePills({
  pills,
  newBadge,
  removeLabel,
  onReorder,
  onRemove,
}: {
  pills: PillData[]
  newBadge: string
  removeLabel: string
  onReorder: (tokens: string[]) => void
  onRemove: (token: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const ids = pills.map((pill) => pill.token)

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      id="client-service-pills"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className="flex flex-wrap gap-2 sm:gap-2">
          {pills.map((pill) => (
            <SortablePill
              key={pill.token}
              pill={pill}
              newBadge={newBadge}
              removeLabel={removeLabel}
              onRemove={() => onRemove(pill.token)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortablePill({
  pill,
  newBadge,
  removeLabel,
  onRemove,
}: {
  pill: PillData
  newBadge: string
  removeLabel: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pill.token,
  })
  const tone = TONES[pill.kind]
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("max-w-full", isDragging && "relative z-10 opacity-80")}
    >
      <span
        {...attributes}
        {...listeners}
        className={cn(
          "inline-flex max-w-full cursor-grab items-center gap-2 rounded-full border py-1.5 pr-1 pl-2.5 text-[13px] leading-normal font-medium select-none active:cursor-grabbing",
          pill.isNew ? tone.pillNew : tone.pill,
          isDragging && "shadow-md"
        )}
      >
        <MenuIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="min-w-0 leading-normal break-words">{pill.label}</span>
        {pill.isNew ? (
          <span className="text-[10px] leading-normal font-semibold tracking-wide uppercase opacity-70">
            {newBadge}
          </span>
        ) : null}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          aria-label={`${removeLabel} — ${pill.label}`}
          title={removeLabel}
          className="flex size-6 shrink-0 items-center justify-center rounded-full opacity-60 hover:bg-black/5 hover:opacity-100"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      </span>
    </li>
  )
}

function ServiceOption({
  tone,
  label,
  checked,
  onToggle,
}: {
  tone: Tone
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        checked ? tone.row : "hover:bg-[#faf8f6]"
      )}
    >
      <Tick state={checked ? "on" : "off"} tone={tone} />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
    </button>
  )
}

function GroupList({
  groups,
  tone,
  selected,
  onToggle,
  onSetMany,
  locale,
  searching,
  allCollapsed,
}: {
  groups: Group[]
  tone: Tone
  selected: Set<string>
  onToggle: (id: string) => void
  onSetMany: (ids: string[], on: boolean) => void
  locale: "da" | "en"
  searching: boolean
  allCollapsed: boolean
}) {
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const effectiveCollapsed = allCollapsed ? new Set(groups.map((g) => g.id)) : collapsed

  function toggleCollapsed(id: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const ids = group.services.map((service) => service.id)
        const ticked = ids.filter((id) => selected.has(id)).length
        const all = ticked === ids.length
        const open = searching || !effectiveCollapsed.has(group.id)
        return (
          <section key={group.id} className="pb-2">
            <div className="sticky top-0 z-[1] flex items-center gap-2 bg-white px-1 py-2">
              <button
                type="button"
                onClick={() => toggleCollapsed(group.id)}
                disabled={searching}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[#faf8f6] disabled:hover:bg-transparent"
              >
                <ChevronDownIcon
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    !open && "-rotate-90"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate text-[15px] font-semibold">{group.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className="h-1.5 w-12 overflow-hidden rounded-full bg-[#eee7df]"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(ticked / ids.length) * 100}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      ticked > 0 ? "font-semibold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {ticked}/{ids.length}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSetMany(ids, !all)}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  all
                    ? "border-[#e8e0d8] text-muted-foreground hover:bg-[#faf8f6]"
                    : "border-primary/30 text-primary hover:bg-primary/5"
                )}
              >
                {all ? t("clientServicesClear") : t("clientServicesSelectAll")}
              </button>
            </div>
            {open ? (
              <div className="divide-y divide-[#f3ede6] px-1">
                {group.services.map((service) => (
                  <ServiceOption
                    key={service.id}
                    tone={tone}
                    label={serviceName(service, locale)}
                    checked={selected.has(service.id)}
                    onToggle={() => onToggle(service.id)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function ManualList({
  tone,
  services,
  pending,
  selected,
  locale,
  newBadge,
  onToggle,
  onRemove,
  onRemovePending,
}: {
  tone: Tone
  services: Service[]
  pending: NewManual[]
  selected: Set<string>
  locale: "da" | "en"
  newBadge: string
  onToggle: (id: string) => void
  onRemove: (service: Service) => void
  onRemovePending: (key: string) => void
}) {
  const { t } = useLanguage()
  return (
    <ul className="divide-y divide-[#f3ede6] px-1">
      {services.map((service) => (
        <li key={service.id} className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <ServiceOption
              tone={tone}
              label={serviceName(service, locale)}
              checked={selected.has(service.id)}
              onToggle={() => onToggle(service.id)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-red-600"
            title={t("clientServicesDeleteManual")}
            aria-label={`${t("clientServicesDeleteManual")} — ${serviceName(service, locale)}`}
            onClick={() => onRemove(service)}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </li>
      ))}
      {pending.map((item) => (
        <li key={item.key} className="flex items-center gap-1">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
              tone.row
            )}
          >
            <Tick state="on" tone={tone} />
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary uppercase">
              {newBadge}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-red-600"
            title={t("clientServicesDeleteManual")}
            aria-label={`${t("clientServicesDeleteManual")} — ${item.name}`}
            onClick={() => onRemovePending(item.key)}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
