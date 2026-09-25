"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { SearchIcon, Settings2Icon } from "lucide-react"

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
import { useHubClients } from "@/hooks/useHubClients"
import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"
import { hubClientInEnabledTab } from "@/lib/admin/hub-clients"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

function ClientSettingsDirectoryTableSkeleton() {
  return (
    <div className="rounded-b-2xl" aria-busy="true" aria-live="polite">
      <div className="border-b border-[#e8e0d8] px-5 py-3 sm:px-6">
        <div className="flex gap-8">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="hidden h-4 w-12 animate-pulse rounded bg-muted sm:block" />
        </div>
      </div>
      <ul className="divide-y divide-[#e8e0d8]">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 max-w-[70%] animate-pulse rounded-md bg-muted" />
            </div>
            <div className="hidden h-4 w-20 animate-pulse rounded bg-muted font-mono sm:block" />
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-[10px] bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function matchesQuery(client: { name: string; slug: string | null; metaAdAccountId: string }, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [client.name, client.slug ?? "", client.metaAdAccountId].join(" ").toLowerCase()
  return haystack.includes(needle)
}

export function AdminClientSettingsDirectory() {
  const { t } = useLanguage()
  const { clients, loading, error } = useHubClients()
  const [query, setQuery] = useState("")

  const enabledClients = useMemo(() => {
    return clients
      .filter((c) => c.inApp && c.slug && hubClientInEnabledTab(c))
      .filter((c) => matchesQuery(c, query))
      .sort((a, b) => a.name.localeCompare(b.name, "da"))
  }, [clients, query])

  return (
    <div className={cn("admin-ui mx-auto flex w-full max-w-4xl flex-col gap-6", outfit.className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("clientSettingsDirectoryTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("clientSettingsDirectoryDescription")}</p>
        <Link
          href="/admin"
          className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("clientSettingsDirectoryHubLink")}
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]">
        <div className="border-b border-[#d3c3b2] px-6 py-4 sm:px-8 lg:px-10">
          <div className="relative max-w-md">
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
              className="h-10 w-full rounded-[15px] border border-border bg-white pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {loading ? (
          <>
            <p className="sr-only">{t("loadingClients")}</p>
            <ClientSettingsDirectoryTableSkeleton />
          </>
        ) : error ? (
          <p className="px-6 py-12 text-center text-sm text-destructive">{t("errorLoadClients")}</p>
        ) : enabledClients.length === 0 ? (
          <p className="px-8 py-12 text-center text-sm text-muted-foreground sm:px-10">
            {t("clientPickerEmptyList")}
          </p>
        ) : (
          <Table containerClassName="rounded-b-2xl">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 sm:pl-6">{t("clientPickerColumnClient")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("clientPickerColumnSlug")}</TableHead>
                <TableHead className="pr-5 text-right sm:pr-6">
                  {t("clientPickerColumnAction")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child_td]:pb-4">
              {enabledClients.map((client) => {
                const displayName = formatClientDisplayName(client.name)
                const slug = client.slug!
                return (
                  <TableRow key={client.key}>
                    <TableCell className="pl-5 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold text-white"
                          aria-hidden="true"
                        >
                          {clientInitialsFromName(displayName)}
                        </span>
                        <span className="font-medium text-foreground">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">
                      /{slug}
                    </TableCell>
                    <TableCell className="pr-5 text-right sm:pr-6">
                      <Button
                        nativeButton={false}
                        render={<Link href={adminClientSettingsBasePath(slug)} />}
                        className="h-9 gap-1.5 px-3"
                      >
                        <Settings2Icon className="size-4" aria-hidden="true" />
                        {t("clientSettingsOpen")}
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
