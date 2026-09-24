"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { resolveContextBarClientList } from "@/lib/admin/client-picker"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function ClientContextBar() {
  const router = useRouter()
  const { t } = useLanguage()
  const { organization, role, loading, setActiveOrganization } = useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)

  const displayName = organization ? formatClientDisplayName(organization.name) : ""

  const listState = useMemo(
    () =>
      resolveContextBarClientList(
        pickerOrganizations,
        query,
        organization?.slug ?? null
      ),
    [pickerOrganizations, query, organization?.slug]
  )

  const isSearching = query.trim().length > 0

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  if (loading || role !== "censio_admin" || !organization) return null

  async function handleSelect(slug: string) {
    if (slug === organization?.slug || switchingSlug) return
    setSwitchingSlug(slug)
    try {
      const success = await setActiveOrganization(slug)
      if (success) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSwitchingSlug(null)
    }
  }

  return (
    <div className={cn("admin-ui", outfit.className, "border-b border-[#d3c3b2] bg-[#faf8f6]")}>
      <div className="flex items-center justify-end gap-3 px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          {t("viewingClient")}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            aria-label={`${t("switchClient")}: ${displayName}`}
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-full border border-[#d3c3b2] bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors",
              "hover:border-primary/40 hover:bg-white focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
              "data-popup-open:border-primary/40 data-popup-open:ring-3 data-popup-open:ring-primary/20"
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold tracking-wide text-white"
              aria-hidden="true"
            >
              {clientInitialsFromName(displayName)}
            </span>
            <span className="truncate">{displayName}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className={cn(
              "admin-ui",
              outfit.className,
              "w-[min(100vw-2rem,22rem)] gap-0 p-0"
            )}
          >
            <div className="border-b border-border p-2.5">
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("searchClients")}
                  aria-label={t("searchClients")}
                  autoComplete="off"
                  className="h-9 w-full rounded-md border border-border bg-white pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
                />
              </div>
              {!isSearching && listState.hiddenCount > 0 ? (
                <p className="mt-2 px-0.5 text-xs text-muted-foreground">
                  {t("clientSwitcherSearchHint")}
                </p>
              ) : null}
            </div>
            <ul
              className="max-h-64 overflow-y-auto px-1 pt-1 pb-3"
              role="listbox"
              aria-label={t("switchClient")}
            >
              {listLoading ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("loadingClients")}
                </li>
              ) : isSearching && listState.items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("noMatchingClients")}
                </li>
              ) : listState.items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("clientPickerEmptyList")}
                </li>
              ) : (
                listState.items.map((option) => {
                  const isActive = option.slug === organization.slug
                  const optionName = formatClientDisplayName(option.name)
                  return (
                    <li key={option.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        disabled={switchingSlug !== null}
                        onClick={() => {
                          void handleSelect(option.slug)
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                          "hover:bg-[#faf8f6] focus-visible:bg-[#faf8f6] focus-visible:outline-none",
                          isActive && "bg-[#faf8f6] font-semibold"
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4 shrink-0 text-primary",
                            isActive ? "opacity-100" : "opacity-0"
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">{optionName}</span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            {!listLoading && listState.hiddenCount > 0 ? (
              <div className="space-y-2 border-t border-border px-3 py-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {listState.mode === "preview"
                    ? t("clientSwitcherMoreCount", { count: listState.hiddenCount })
                    : t("clientSwitcherSearchLimit", { count: listState.hiddenCount })}
                </p>
                <Link
                  href="/klienter"
                  onClick={() => setOpen(false)}
                  className="block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("clientSwitcherFullList")}
                </Link>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
