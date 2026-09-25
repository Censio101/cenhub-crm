"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CheckIcon, Loader2Icon, SearchIcon, Settings2Icon } from "lucide-react"

import { ClientPickerActivePill } from "@/components/admin/client-picker/ClientPickerActiveIndicator"
import { ClientPickerStatusChips } from "@/components/admin/client-picker/ClientPickerStatusChips"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { filterPickerOrganizations } from "@/lib/admin/client-picker"
import { recordRecentClientSlug } from "@/lib/admin/client-picker-recents"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

function ClientPickerTableSkeleton() {
  return (
    <div className="rounded-b-2xl" aria-busy="true" aria-live="polite">
      <div className="border-b border-[#e8e0d8] px-5 py-3 sm:px-6">
        <div className="flex gap-8">
          <div className="h-4 w-16 animate-pulse rounded bg-muted/80" />
          <div className="hidden h-4 w-12 animate-pulse rounded bg-muted/80 sm:block" />
        </div>
      </div>
      <ul className="divide-y divide-[#e8e0d8]">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
            <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-44 max-w-[70%] animate-pulse rounded-md bg-muted/80" />
            </div>
            <div className="hidden h-4 w-20 animate-pulse rounded bg-muted/80 font-mono sm:block" />
            <div className="hidden h-6 w-28 animate-pulse rounded-full bg-muted/80 md:block" />
            <div className="ml-auto flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-[10px] bg-muted/80" />
              <div className="h-9 w-32 animate-pulse rounded-[10px] bg-muted/80" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ClientPickerPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { organization: activeOrg, setActiveOrganization } = useActiveOrganization()
  const { pickerOrganizations, loading, error } = useAdminOrganizationList()
  const [query, setQuery] = useState("")
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)

  const visible = useMemo(
    () => filterPickerOrganizations(pickerOrganizations, query),
    [pickerOrganizations, query]
  )

  const activePickerOrg = useMemo(() => {
    if (!activeOrg?.slug) return null
    return pickerOrganizations.find((org) => org.slug === activeOrg.slug) ?? null
  }, [activeOrg?.slug, pickerOrganizations])

  const activeDisplayName = activePickerOrg
    ? formatClientDisplayName(activePickerOrg.name)
    : activeOrg
      ? formatClientDisplayName(activeOrg.name)
      : null

  const isOpening = openingSlug !== null

  async function handleOpen(slug: string) {
    if (openingSlug) return
    setOpeningSlug(slug)
    try {
      const ok = await openClientDashboard(slug, setActiveOrganization, {
        router,
        path: "/",
      })
      if (ok) {
        recordRecentClientSlug(slug)
        router.refresh()
      }
    } finally {
      setOpeningSlug(null)
    }
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-5", outfit.className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("clientPickerTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientPickerDescription")}</p>
        </div>
        <Link
          href="/admin/clients"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Settings2Icon className="size-4" aria-hidden="true" />
          {t("clientSettingsLabel")}
        </Link>
      </div>

      {!loading && activeOrg && activeDisplayName ? (
        <div
          className="dashboard-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#d3c3b2] bg-gradient-to-r from-primary/[0.14] via-primary/[0.06] to-transparent px-4 py-3 sm:px-5"
          role="status"
          aria-label={`${t("clientPickerActiveBadge")}: ${activeDisplayName}`}
        >
          <ClientPickerActivePill />
          <span className="font-semibold text-foreground">{activeDisplayName}</span>
          {activeOrg.slug ? (
            <span className="font-mono text-xs text-muted-foreground">/{activeOrg.slug}</span>
          ) : null}
          {activePickerOrg ? (
            <Button
              type="button"
              size="sm"
              className="ml-auto h-8"
              disabled={isOpening}
              onClick={() => {
                void handleOpen(activePickerOrg.slug)
              }}
            >
              {openingSlug === activePickerOrg.slug ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  {t("openingDashboard")}
                </>
              ) : (
                t("openClientDashboardCta")
              )}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="dashboard-card overflow-hidden rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]">
        <div className="flex flex-col gap-3 border-b border-[#d3c3b2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchClients")}
              aria-label={t("searchClients")}
              autoComplete="off"
              disabled={loading}
              className="h-10 w-full rounded-[15px] border border-border bg-white pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {loading ? t("loadingClients") : t("clientsCount", { count: visible.length })}
          </p>
        </div>

        {error ? (
          <p className="px-6 py-12 text-center text-sm text-destructive">{t("errorLoadClients")}</p>
        ) : loading ? (
          <>
            <p className="sr-only">{t("loadingClients")}</p>
            <ClientPickerTableSkeleton />
          </>
        ) : visible.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">
            {pickerOrganizations.length === 0
              ? t("clientPickerEmptyList")
              : t("noMatchingClients")}
          </p>
        ) : (
          <Table containerClassName="rounded-b-2xl">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 sm:pl-6">{t("clientPickerColumnClient")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("clientPickerColumnSlug")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("clientPickerColumnStatus")}</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap pr-5 text-right sm:pr-6">
                  {t("clientPickerColumnAction")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child_td]:pb-4">
              {visible.map((organization) => {
                const displayName = formatClientDisplayName(organization.name)
                const busy = openingSlug === organization.slug
                const isActiveDashboard = activeOrg?.slug === organization.slug
                return (
                  <TableRow
                    key={organization.id}
                    className={cn(
                      "transition-colors",
                      busy && "bg-primary/5",
                      isOpening && !busy && "opacity-50",
                      isActiveDashboard
                        ? "border-l-[3px] border-l-primary bg-gradient-to-r from-primary/[0.14] via-primary/[0.06] to-transparent hover:!bg-gradient-to-r hover:!from-primary/[0.14] hover:!via-primary/[0.06] hover:!to-transparent"
                        : undefined
                    )}
                    aria-busy={busy || undefined}
                    aria-current={isActiveDashboard ? "true" : undefined}
                  >
                    <TableCell className="relative min-w-0 max-w-[min(100%,16rem)] pl-5 sm:max-w-none sm:pl-6 lg:max-w-[20rem] xl:max-w-none">
                      <button
                        type="button"
                        disabled={isOpening}
                        onClick={() => {
                          void handleOpen(organization.slug)
                        }}
                        className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed"
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold text-white"
                          aria-hidden="true"
                        >
                          {clientInitialsFromName(displayName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "flex min-w-0 items-center gap-1.5 font-medium",
                              isActiveDashboard ? "font-semibold text-foreground" : "text-foreground"
                            )}
                            title={displayName}
                          >
                            <span className="truncate">{displayName}</span>
                            {isActiveDashboard ? (
                              <>
                                <CheckIcon
                                  className="size-4 shrink-0 text-primary"
                                  strokeWidth={2.5}
                                  aria-hidden="true"
                                />
                                <span className="sr-only">{t("clientPickerActiveNow")}</span>
                              </>
                            ) : null}
                          </span>
                          <ClientPickerStatusChips
                            organization={organization}
                            className="mt-1.5 md:hidden"
                          />
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">
                      /{organization.slug}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ClientPickerStatusChips organization={organization} />
                    </TableCell>
                    <TableCell className="w-[1%] whitespace-nowrap pr-5 text-right sm:pr-6">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
                        <Button
                          nativeButton={false}
                          render={
                            <Link href={adminClientSettingsBasePath(organization.slug)} prefetch />
                          }
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 bg-white px-2.5 sm:px-3"
                          disabled={isOpening}
                          aria-label={t("clientSettingsOpen")}
                        >
                          <Settings2Icon className="size-4" aria-hidden="true" />
                          <span className="hidden lg:inline">{t("clientSettingsOpen")}</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isOpening}
                          onClick={() => {
                            void handleOpen(organization.slug)
                          }}
                          className="h-9 shrink-0 px-2.5 sm:px-3"
                        >
                          {busy ? (
                            <>
                              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                              <span className="hidden sm:inline">{t("openingDashboard")}</span>
                            </>
                          ) : (
                            <>
                              <span className="lg:hidden">{t("clientPickerOpenShort")}</span>
                              <span className="hidden lg:inline">{t("openClientDashboardCta")}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
