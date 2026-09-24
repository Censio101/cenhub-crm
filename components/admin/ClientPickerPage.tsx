"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Loader2Icon, SearchIcon } from "lucide-react"

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
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function ClientPickerPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const { pickerOrganizations, loading, error } = useAdminOrganizationList()
  const [query, setQuery] = useState("")
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)

  const visible = useMemo(
    () => filterPickerOrganizations(pickerOrganizations, query),
    [pickerOrganizations, query]
  )

  async function handleOpen(slug: string) {
    if (openingSlug) return
    setOpeningSlug(slug)
    try {
      await openClientDashboard(slug, setActiveOrganization, {
        router,
        path: "/",
      })
      router.refresh()
    } finally {
      setOpeningSlug(null)
    }
  }

  return (
    <div className={cn("admin-ui mx-auto flex w-full max-w-4xl flex-col gap-6", outfit.className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t("clientPickerTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientPickerDescription")}</p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("clientPickerManageLink")}
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]">
        <div className="flex flex-col gap-3 border-b border-[#d3c3b2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
              className="h-10 w-full rounded-[15px] border border-border bg-white pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {loading
              ? t("loadingClients")
              : t("clientsCount", { count: visible.length })}
          </p>
        </div>

        {error ? (
          <p className="px-6 py-10 text-center text-sm text-destructive">{t("errorLoadClients")}</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            {t("loadingClients")}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">
            {pickerOrganizations.length === 0
              ? t("clientPickerEmptyList")
              : t("noMatchingClients")}
          </p>
        ) : (
          <Table containerClassName="rounded-b-2xl pb-2">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">{t("clientPickerColumnClient")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("clientPickerColumnSlug")}</TableHead>
                <TableHead className="pr-6 text-right">{t("clientPickerColumnAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child_td]:pb-2">
              {visible.map((organization) => {
                const displayName = formatClientDisplayName(organization.name)
                const busy = openingSlug === organization.slug
                return (
                  <TableRow key={organization.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold text-white"
                          aria-hidden="true"
                        >
                          {clientInitialsFromName(displayName)}
                        </span>
                        <span className="font-medium text-foreground">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                      /{organization.slug}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          void handleOpen(organization.slug)
                        }}
                        className="h-9"
                      >
                        {busy ? (
                          <>
                            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                            {t("openingDashboard")}
                          </>
                        ) : (
                          t("openClientDashboardCta")
                        )}
                      </Button>
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
