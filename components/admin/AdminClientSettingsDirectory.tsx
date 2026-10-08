"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { LayersIcon, MousePointerClickIcon, SearchIcon, Settings2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useHubClients } from "@/hooks/useHubClients"
import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"
import type { HubClient } from "@/lib/admin/hub-clients"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { outfit, poppins } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

function ClientSettingsDirectoryListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ul className="divide-y divide-[#efe6dd]">
        {Array.from({ length: 5 }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-2.5 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="h-4.5 w-44 max-w-[70%] animate-pulse rounded-md bg-muted" />
            </div>
            <div className="hidden h-6 w-32 animate-pulse rounded-full bg-muted md:block" />
            <div className="hidden h-6 w-24 animate-pulse rounded-full bg-muted md:block" />
            <div className="h-8 w-24 shrink-0 animate-pulse justify-self-end rounded-[10px] bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Lead sheet column: the attached sheet name as a pill.
 * Pill color carries the ownership meaning — neutral = standard default sheet, orange = custom client sheet.
 */
function ClientLeadSheetPill({ client }: { client: HubClient }) {
  const { t } = useLanguage()
  const sheet = client.leadSheet
  if (!sheet) return <span className="text-sm text-muted-foreground">—</span>

  const isCustom = sheet.isClientOwned && !sheet.isSystemDefault

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium leading-5 shadow-sm",
        isCustom
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-[#d3c3b2] bg-[#faf8f6] text-foreground"
      )}
      title={
        isCustom
          ? `${sheet.name} — ${t("webhookSheetClientOwned")}`
          : `${sheet.name} — ${t("leadSheetsBadgeDefault")}`
      }
    >
      <LayersIcon
        className={cn("size-3.5 shrink-0", isCustom ? "text-primary" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="truncate">{sheet.name}</span>
    </span>
  )
}

/** Status column: sheet health only — Active, Review mappings, or Need setup. */
function ClientLeadSheetStatus({ client }: { client: HubClient }) {
  const { t } = useLanguage()
  const sheet = client.leadSheet
  const needsReview = client.webhookStale || (client.metaRemapCount ?? 0) > 0

  if (!sheet) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#d3c3b2] bg-white px-2 py-0.5 text-[13px] font-medium leading-5 text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
        {t("filterNeedsSetup")}
      </span>
    )
  }

  if (needsReview) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[13px] font-medium leading-5 text-amber-900"
        title={t("clientDirectoryWebhookReviewTitle")}
      >
        <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
        {t("clientDirectoryWebhookReview")}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[13px] font-medium leading-5 text-emerald-800">
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
      {t("statusActive")}
    </span>
  )
}

function matchesQuery(
  client: { name: string; slug: string | null; metaAdAccountId: string },
  query: string
) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [client.name, client.slug ?? "", client.metaAdAccountId].join(" ").toLowerCase()
  return haystack.includes(needle)
}

export function AdminClientSettingsDirectory() {
  const { t } = useLanguage()
  const { clients, loading, error } = useHubClients()
  const [query, setQuery] = useState("")

  const visibleClients = useMemo(() => {
    return clients
      .filter((c) => c.inApp && c.slug)
      .filter((c) => matchesQuery(c, query))
      .sort((a, b) => a.name.localeCompare(b.name, "da"))
  }, [clients, query])

  return (
    <div className={cn("admin-ui mx-auto flex w-full max-w-5xl flex-col gap-6", outfit.className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-white text-primary shadow-sm">
          <MousePointerClickIcon className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("clientPickerTitle")}
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]">
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
              className="h-10 w-full rounded-[15px] border border-border bg-white pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
            />
          </div>
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {loading ? t("loadingClients") : t("clientsCount", { count: visibleClients.length })}
          </p>
        </div>

        {loading ? (
          <>
            <p className="sr-only">{t("loadingClients")}</p>
            <ClientSettingsDirectoryListSkeleton />
          </>
        ) : error ? (
          <p className="px-6 py-12 text-center text-sm text-destructive">{t("errorLoadClients")}</p>
        ) : visibleClients.length === 0 ? (
          <p className="px-8 py-12 text-center text-sm text-muted-foreground sm:px-10">
            {t("clientPickerEmptyList")}
          </p>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-[#e8e0d8] px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-6 md:grid">
              <span>{t("clientPickerColumnClient")}</span>
              <span>{t("clientDirectoryColumnLeadSheet")}</span>
              <span>{t("clientPickerColumnStatus")}</span>
              <span className="text-right">{t("clientPickerColumnAction")}</span>
            </div>
            <ul className="divide-y divide-[#efe6dd]">
              {visibleClients.map((client) => {
                const displayName = formatClientDisplayName(client.name)
                const slug = client.slug!
                return (
                  <li key={client.key}>
                    <Link
                      href={adminClientSettingsBasePath(slug)}
                      className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-2.5 transition-colors hover:bg-[#faf8f6] focus-visible:bg-[#faf8f6] focus-visible:outline-none sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold text-white shadow-sm"
                          aria-hidden="true"
                        >
                          {clientInitialsFromName(displayName)}
                        </span>
                        <span
                          className={cn(
                            poppins.className,
                            "min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-base"
                          )}
                        >
                          {displayName}
                        </span>
                      </span>
                      <span className="hidden min-w-0 md:block">
                        <ClientLeadSheetPill client={client} />
                      </span>
                      <span className="hidden min-w-0 md:block">
                        <ClientLeadSheetStatus client={client} />
                      </span>
                      <span className="inline-flex h-9 shrink-0 items-center justify-self-end gap-1.5 rounded-[10px] border border-[#d3c3b2] bg-white px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                        <Settings2Icon className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{t("clientSettingsOpen")}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
