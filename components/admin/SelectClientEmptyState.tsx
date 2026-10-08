"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { HistoryIcon, Loader2Icon, SearchIcon, Settings2Icon, XIcon } from "lucide-react"

import { ClientPickerStatusChips } from "@/components/admin/client-picker/ClientPickerStatusChips"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { filterPickerOrganizations, type PickerOrganization } from "@/lib/admin/client-picker"
import { readRecentClientSlugs, recordRecentClientSlug } from "@/lib/admin/client-picker-recents"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

const cardClass =
  "admin-ui mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]"

const avatarClass =
  "flex shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] font-semibold text-white"

function ClientAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(avatarClass, size === "sm" ? "size-7 text-[11px]" : "size-10 text-sm")}
      aria-hidden="true"
    >
      {clientInitialsFromName(name)}
    </span>
  )
}

function PickerSkeleton() {
  return (
    <div className={cn(cardClass, outfit.className)} aria-busy="true" aria-live="polite">
      <div className="space-y-2 border-b border-[#e8e0d8] px-6 py-5">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex items-center justify-between border-b border-[#e8e0d8] px-6 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="border-b border-[#e8e0d8] px-6 py-3">
        <div className="h-10 w-full animate-pulse rounded-[15px] bg-muted" />
      </div>
      <ul className="divide-y divide-[#efe6dd]">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-6 py-3">
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 max-w-[60%] animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SelectClientEmptyState() {
  const { t } = useLanguage()
  const { mustPickClient: showPicker } = useAdminClientPickerGate()
  const { setActiveOrganization } = useActiveOrganization()
  const {
    pickerOrganizations,
    loading: listLoading,
    error: listError,
    reload: reloadList,
  } = useAdminOrganizationList()
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(
    () => filterPickerOrganizations(pickerOrganizations, query),
    [pickerOrganizations, query]
  )

  const recent = useMemo(() => {
    const bySlug = new Map(pickerOrganizations.map((org) => [org.slug, org]))
    return readRecentClientSlugs()
      .map((slug) => bySlug.get(slug))
      .filter((org): org is PickerOrganization => Boolean(org))
  }, [pickerOrganizations])

  const isOpening = openingSlug !== null
  const safeHighlight = Math.min(highlight, Math.max(visible.length - 1, 0))

  // "/" jumps to search (unless the user is already typing somewhere).
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${safeHighlight}"]`)
    row?.scrollIntoView({ block: "nearest" })
  }, [safeHighlight, visible.length])

  async function handleOpen(slug: string) {
    if (openingSlug) return
    setOpeningSlug(slug)
    try {
      const ok = await setActiveOrganization(slug)
      if (ok) recordRecentClientSlug(slug)
    } finally {
      setOpeningSlug(null)
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlight(Math.min(safeHighlight + 1, visible.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlight(Math.max(safeHighlight - 1, 0))
    } else if (event.key === "Enter") {
      const target = visible[safeHighlight]
      if (target) {
        event.preventDefault()
        void handleOpen(target.slug)
      }
    } else if (event.key === "Escape" && query) {
      event.preventDefault()
      setQuery("")
    }
  }

  if (!showPicker) return null

  if (listLoading) return <PickerSkeleton />

  // The list could not be loaded: say so and offer a retry — never claim "no clients".
  if (listError && pickerOrganizations.length === 0) {
    return (
      <div
        className={cn(
          cardClass,
          outfit.className,
          "flex flex-col items-center gap-4 px-8 py-12 text-center"
        )}
      >
        <p className="text-sm text-muted-foreground" role="alert">
          {t("clientPickerLoadError")}
        </p>
        <Button
          type="button"
          className="h-10"
          onClick={() => {
            void reloadList()
          }}
        >
          {t("dashboardRetry")}
        </Button>
      </div>
    )
  }

  if (pickerOrganizations.length === 0) {
    return (
      <div
        className={cn(
          cardClass,
          outfit.className,
          "flex flex-col items-center gap-4 px-8 py-12 text-center"
        )}
      >
        <h2 className="text-lg font-medium text-foreground">{t("clientPickerEmptyListTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("clientPickerEmptyListHint")}</p>
        <Button nativeButton={false} render={<Link href="/admin/clients" />} className="mt-2 h-10">
          {t("navClientSettings")}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        cardClass,
        outfit.className,
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
      )}
    >
      <header className="flex flex-col gap-3 border-b border-[#e8e0d8] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t("clientPickerTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("clientPickerDescription")}</p>
        </div>
        <Link
          href="/admin/clients"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Settings2Icon className="size-4" aria-hidden="true" />
          {t("clientSettingsLabel")}
        </Link>
      </header>

      {recent.length > 0 ? (
        <div className="border-b border-[#e8e0d8] px-5 py-4 sm:px-6">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <HistoryIcon className="size-3.5" aria-hidden="true" />
            {t("clientPickerContinueRecent")}
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((org) => {
              const busy = openingSlug === org.slug
              return (
                <button
                  key={org.slug}
                  type="button"
                  disabled={isOpening}
                  onClick={() => {
                    void handleOpen(org.slug)
                  }}
                  className={cn(
                    "inline-flex max-w-full items-center gap-2 rounded-full border border-[#d3c3b2] bg-white py-1 pr-3.5 pl-1 text-sm font-medium text-foreground shadow-sm transition-colors",
                    "hover:border-primary/40 hover:bg-[#faf8f6] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {busy ? (
                    <span className="flex size-7 items-center justify-center">
                      <Loader2Icon className="size-4 animate-spin text-primary" aria-hidden="true" />
                    </span>
                  ) : (
                    <ClientAvatar name={org.name} size="sm" />
                  )}
                  <span className="truncate">{formatClientDisplayName(org.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="border-b border-[#e8e0d8] px-5 pt-3 pb-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <span>{t("clientPickerAllClients")}</span>
          <span className="tabular-nums">{t("clientsCount", { count: String(visible.length) })}</span>
        </div>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setHighlight(0)
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("searchClients")}
            aria-label={t("searchClients")}
            className="h-11 w-full rounded-[15px] border border-border bg-white pr-10 pl-10 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label={t("clientPickerClearSearch")}
              className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
              /
            </kbd>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">{t("clientPickerEmptySearchTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientPickerEmptySearchHint")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9"
            onClick={() => {
              setQuery("")
              searchRef.current?.focus()
            }}
          >
            {t("clientPickerClearSearch")}
          </Button>
        </div>
      ) : (
        <div
          ref={listRef}
          role="listbox"
          aria-label={t("clientPickerAllClients")}
          className="max-h-[min(26rem,55dvh)] overflow-y-auto overscroll-contain border-t border-[#efe6dd] [scrollbar-gutter:stable]"
        >
          <Table containerClassName="overflow-visible">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 pl-5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:pl-6">
                  {t("clientPickerColumnClient")}
                </TableHead>
                <TableHead className="hidden h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase md:table-cell">
                  {t("clientPickerColumnStatus")}
                </TableHead>
                <TableHead className="h-9 w-[1%] pr-6 pl-3 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("clientPickerColumnAction")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child_td]:pb-4">
              {visible.map((org, index) => {
                const displayName = formatClientDisplayName(org.name)
                const busy = openingSlug === org.slug
                const highlighted = index === safeHighlight
                return (
                  <TableRow
                    key={org.id}
                    role="option"
                    aria-selected={highlighted}
                    data-index={index}
                    onMouseEnter={() => setHighlight(index)}
                    className={cn(
                      "border-l-[3px] transition-colors",
                      highlighted
                        ? "border-l-primary bg-primary/[0.07]"
                        : "border-l-transparent hover:bg-[#faf8f6]",
                      busy && "bg-primary/10",
                      isOpening && !busy && "opacity-50"
                    )}
                  >
                    <TableCell className="min-w-0 py-3 pl-5 sm:pl-6">
                      <button
                        type="button"
                        disabled={isOpening}
                        aria-label={`${displayName} (${org.slug})`}
                        onClick={() => {
                          void handleOpen(org.slug)
                        }}
                        className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed"
                      >
                        <ClientAvatar name={org.name} />
                        <span className="truncate text-[15px] font-medium text-foreground">
                          {displayName}
                        </span>
                      </button>
                      <div className="mt-1.5 md:hidden">
                        <ClientPickerStatusChips organization={org} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-3 md:table-cell">
                      <ClientPickerStatusChips organization={org} />
                    </TableCell>
                    <TableCell className="py-3 pr-6 pl-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 min-w-[5.25rem] shrink-0"
                        disabled={isOpening}
                        onClick={() => {
                          void handleOpen(org.slug)
                        }}
                      >
                        {busy ? (
                          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {busy ? t("openingDashboard") : t("clientPickerOpenShort")}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
