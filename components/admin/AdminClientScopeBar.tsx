"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { ChevronDownIcon, ExternalLinkIcon, Loader2Icon, SearchIcon } from "lucide-react"

import { AdminClientScopeBarSkeleton } from "@/components/admin/ClientManageIdentitySkeleton"
import { ClientManageScopeIdentity } from "@/components/admin/ClientManageScopeIdentity"
import { useAdminClientSwitch } from "@/components/admin/AdminClientSwitchContext"
import { useAdminClientPending } from "@/components/admin/use-admin-client-pending"
import { ClientSwitcherOptionRow } from "@/components/admin/ClientSwitcherOptionRow"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"
import { resolveContextBarClientList } from "@/lib/admin/client-picker"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

function AdminClientScopeBarContent() {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { switchingSlug, beginSwitch, endSwitch } = useAdminClientSwitch()
  const [openingDashboard, setOpeningDashboard] = useState(false)

  const { slug, organization, isColdLoad, isPending, showSwitchingUI, contentReady } =
    useAdminClientPending()

  const listState = useMemo(
    () => resolveContextBarClientList(pickerOrganizations, query, slug ?? null),
    [pickerOrganizations, query, slug]
  )

  const isSearching = query.trim().length > 0

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  useEffect(() => {
    if (!switchingSlug || !slug) return
    if (slug === switchingSlug && contentReady) {
      endSwitch()
    }
  }, [slug, switchingSlug, contentReady, endSwitch])

  const switchingClient = useMemo(() => {
    if (!switchingSlug) return null
    return pickerOrganizations.find((option) => option.slug === switchingSlug) ?? null
  }, [pickerOrganizations, switchingSlug])

  const switchingDisplayName = switchingClient
    ? formatClientDisplayName(switchingClient.name)
    : switchingSlug
      ? `/${switchingSlug}`
      : ""

  if (!slug) return null

  if (isColdLoad) {
    return (
      <div className={outfit.className}>
        <p className="sr-only">{t("loadingClient")}</p>
        <AdminClientScopeBarSkeleton />
      </div>
    )
  }

  const scopeSlug = organization?.slug ?? slug
  const scopeDisplayName = organization
    ? formatClientDisplayName(organization.name)
    : slug

  async function handleSelect(nextSlug: string) {
    if (nextSlug === slug || switchingSlug) return
    beginSwitch(nextSlug)
    try {
      const success = await setActiveOrganization(nextSlug)
      if (success) {
        setOpen(false)
        router.push(adminClientSettingsBasePath(nextSlug))
      } else {
        endSwitch()
      }
    } catch {
      endSwitch()
    }
  }

  return (
    <div
      className={cn(
        "admin-ui relative mb-6 w-full min-w-0 overflow-hidden rounded-xl border border-[#d3c3b2] bg-[#faf8f6]",
        showSwitchingUI && "border-primary/35 ring-2 ring-primary/15",
        outfit.className
      )}
      data-admin-scope="client"
      aria-busy={isPending || undefined}
    >
      {showSwitchingUI ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-[#faf8f6]/50"
          aria-hidden="true"
        />
      ) : null}
      <div className="relative flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
            {t("adminClientScopeBadge")}
          </span>
          <ClientManageScopeIdentity
            displayName={scopeDisplayName}
            slug={scopeSlug}
            isTransitioning={isPending}
          />
        </div>

        <div className="relative z-20 flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href="/admin/clients"
            className={cn(
              "text-sm font-medium text-primary underline-offset-4 hover:underline",
              isPending && "pointer-events-none opacity-50"
            )}
          >
            {t("adminClientScopeAllClients")}
          </Link>

          <Popover
            open={open}
            onOpenChange={(next) => {
              if (showSwitchingUI) return
              setOpen(next)
            }}
          >
            <PopoverTrigger
              aria-label={`${t("switchClient")}: ${scopeDisplayName}`}
              disabled={showSwitchingUI}
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[#d3c3b2] bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm",
                "hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
                "disabled:cursor-wait disabled:opacity-90",
                showSwitchingUI && "border-primary/40 bg-white"
              )}
            >
              {showSwitchingUI ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              ) : null}
              <span className="truncate">
                {showSwitchingUI
                  ? t("switchingClient", { name: switchingDisplayName ?? switchingSlug })
                  : t("switchClient")}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] gap-0 p-0">
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
              </div>
              <ul className="max-h-64 overflow-y-auto px-1 py-2" role="listbox">
                {listLoading ? (
                  <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {t("loadingClients")}
                  </li>
                ) : listState.items.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {t("noMatchingClients")}
                  </li>
                ) : (
                  listState.items.map((option) => (
                    <ClientSwitcherOptionRow
                      key={option.id}
                      option={option}
                      isActive={option.slug === slug}
                      isSwitching={option.slug === switchingSlug}
                      disabled={showSwitchingUI && option.slug !== switchingSlug}
                      onSelect={() => {
                        void handleSelect(option.slug)
                      }}
                    />
                  ))
                )}
              </ul>
              {!listLoading && listState.hiddenCount > 0 && !isSearching ? (
                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  {t("clientSwitcherMoreCount", { count: listState.hiddenCount })}
                </div>
              ) : null}
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 bg-white"
            disabled={openingDashboard || showSwitchingUI}
            onClick={() => {
              setOpeningDashboard(true)
              void openClientDashboard(scopeSlug, setActiveOrganization, { newTab: true }).finally(
                () => setOpeningDashboard(false)
              )
            }}
          >
            <ExternalLinkIcon className="size-4" aria-hidden="true" />
            {openingDashboard ? t("openingDashboard") : t("openDashboard")}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AdminClientScopeBarFallback() {
  return <AdminClientScopeBarSkeleton />
}

export function AdminClientScopeBar() {
  return (
    <Suspense fallback={<AdminClientScopeBarFallback />}>
      <AdminClientScopeBarContent />
    </Suspense>
  )
}
