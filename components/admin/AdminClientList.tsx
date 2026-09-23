"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { RefreshCwIcon } from "lucide-react"

import { AdminHubToolbar } from "@/components/admin/AdminHubToolbar"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import {
  hubClientInEnabledTab,
  hubClientInNeedsSetupTab,
  type HubClient,
} from "@/lib/admin/hub-clients"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { outfit, poppins } from "@/lib/fonts/app-fonts"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type ClientFilter = "all" | "enabled" | "needs-setup"

const FILTERS: ClientFilter[] = ["enabled", "needs-setup", "all"]

const FILTER_LABELS: Record<ClientFilter, MessageKey> = {
  enabled: "filterEnabled",
  "needs-setup": "filterNeedsSetup",
  all: "filterAll",
}

function clientInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatAdAccountId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`
}

export function AdminClientList() {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const [clients, setClients] = useState<HubClient[]>([])
  const [partnerFetchError, setPartnerFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ClientFilter>("enabled")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)
  const [enablingPartnerId, setEnablingPartnerId] = useState<string | null>(null)

  async function loadClients(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations", { cache: "no-store" })
      if (!response.ok) throw new Error(t("errorFetchClients"))
      const data = (await response.json()) as {
        clients: HubClient[]
        meta?: { partnerFetchError?: string | null }
      }
      setClients(data.clients)
      setPartnerFetchError(data.meta?.partnerFetchError ?? null)
    } catch (loadError) {
      console.error(loadError)
      setError(t("errorLoadClients"))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return clients
      .filter((client) => {
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "enabled"
              ? hubClientInEnabledTab(client)
              : hubClientInNeedsSetupTab(client)
        if (!matchesFilter) return false
        if (!needle) return true
        const haystack = [
          client.name,
          client.slug ?? "",
          client.metaAdAccountId,
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(needle)
      })
      .sort((left, right) => {
        if (filter === "all") {
          const leftEnabled = hubClientInEnabledTab(left)
          const rightEnabled = hubClientInEnabledTab(right)
          if (leftEnabled !== rightEnabled) return leftEnabled ? -1 : 1
        }
        return left.name.localeCompare(right.name, "da")
      })
  }, [clients, filter, query])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
          demoMode: true,
        }),
      })
      const data = (await response.json()) as {
        organization?: { slug: string }
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? t("errorCreateClient"))
      setName("")
      setSlug("")
      await loadClients(true)
      if (data.organization?.slug) {
        router.push(`/admin/${data.organization.slug}`)
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("errorCreate"))
    } finally {
      setCreating(false)
    }
  }

  async function handlePartnerEnable(client: HubClient) {
    setEnablingPartnerId(client.metaAdAccountId)
    setError(null)
    try {
      const response = await fetch("/api/admin/meta-clients/enable-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metaAdAccountId: client.metaAdAccountId,
          accountName: client.name,
          enabled: true,
        }),
      })
      const data = (await response.json()) as {
        error?: string
        organization?: { slug: string }
      }
      if (!response.ok) throw new Error(data.error ?? t("errorEnableMetaClient"))

      await loadClients(true)
      if (data.organization?.slug) {
        router.push(`/admin/${data.organization.slug}`)
      }
    } catch (enableError) {
      setError(
        enableError instanceof Error ? enableError.message : t("errorEnableMetaClient")
      )
    } finally {
      setEnablingPartnerId(null)
    }
  }

  async function handleSync(organizationSlug: string) {
    setSyncingSlug(organizationSlug)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationSlug}/meta/sync`,
        { method: "POST" }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("syncFailed"))
      await loadClients(true)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncingSlug(null)
    }
  }

  return (
    <div className={cn("admin-hub", poppins.className, "mx-auto flex w-full max-w-6xl flex-col gap-6")}>
      <header className={outfit.className}>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("brand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          {t("clientsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("clientsDescription")}</p>
      </header>

      <AdminHubToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder={t("searchClients")}
        filter={filter}
        onFilterChange={setFilter}
        filters={FILTERS}
        filterLabels={FILTER_LABELS}
        countLabel={t("clientsCount", { count: visible.length })}
        loading={loading}
        loadingLabel={t("loadingClients")}
      />

      {partnerFetchError ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("businessManager")} {partnerFetchError}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="sr-only">{t("loadingClients")}</p>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-2xl bg-card p-[18px] shadow-[0_1px_3px_rgba(26,18,8,0.06)]"
            >
              <div className="flex items-start gap-3">
                <div className="size-10 animate-pulse rounded-[10px] bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
              <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
                <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
                <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d3c3b2] bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {clients.length === 0 ? t("noClientsYet") : t("noMatchingClients")}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {visible.map((client) => {
            const isEnabled = hubClientInEnabledTab(client)
            const isLive = client.metaLive
            const isPartnerOnly = client.partnerOnly
            const quietButtonClass =
              "inline-flex items-center justify-center rounded-[10px] bg-[#faf8f6] px-3.5 py-2.5 text-center text-[13px] font-semibold text-foreground transition-colors hover:bg-[#e8e0d8] disabled:cursor-not-allowed disabled:opacity-65"
            const primaryButtonClass =
              "inline-flex items-center justify-center rounded-[10px] bg-primary px-3.5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-[#c4530a] disabled:cursor-wait disabled:opacity-65"

            return (
              <article
                key={client.key}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border border-[#d3c3b2] bg-card p-[18px]",
                  isEnabled
                    ? "shadow-[0_1px_3px_rgba(26,18,8,0.06)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(26,18,8,0.12)]"
                    : "shadow-[0_1px_2px_rgba(26,18,8,0.04)]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-[15px] font-semibold tracking-wide text-white"
                    aria-hidden="true"
                  >
                    {clientInitials(client.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg leading-tight font-semibold">
                      {client.name}
                    </h2>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {isPartnerOnly
                        ? formatAdAccountId(client.metaAdAccountId)
                        : `/${client.slug}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold",
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {isEnabled ? t("filterEnabled") : t("filterNeedsSetup")}
                  </span>
                  {isEnabled ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {client.leadCount} {t("leads")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {client.userCount} {t("users")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {isPartnerOnly ? t("bmUnlinked") : t("metaNotConnected")}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-1 grid grid-cols-3 gap-2">
                  {isPartnerOnly ? (
                    <button
                      type="button"
                      className={cn(primaryButtonClass, "col-span-3")}
                      disabled={enablingPartnerId === client.metaAdAccountId}
                      onClick={() => {
                        void handlePartnerEnable(client)
                      }}
                    >
                      {enablingPartnerId === client.metaAdAccountId
                        ? t("activating")
                        : t("enableClient")}
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/admin/${client.slug}`}
                        className={isEnabled ? quietButtonClass : primaryButtonClass}
                      >
                        {t("setting")}
                      </Link>
                      <button
                        type="button"
                        className={isEnabled ? primaryButtonClass : quietButtonClass}
                        disabled={openingSlug === client.slug}
                        onClick={() => {
                          if (!client.slug) return
                          setOpeningSlug(client.slug)
                          void openClientDashboard(
                            client.slug,
                            setActiveOrganization,
                            router
                          ).finally(() => setOpeningSlug(null))
                        }}
                      >
                        {openingSlug === client.slug
                          ? t("openingDashboard")
                          : t("openDashboard")}
                      </button>
                      <button
                        type="button"
                        className={cn(quietButtonClass, "gap-1.5")}
                        disabled={!isLive || syncingSlug === client.slug}
                        onClick={() => {
                          if (!client.slug) return
                          void handleSync(client.slug)
                        }}
                      >
                        <RefreshCwIcon
                          className={cn(
                            "size-3.5",
                            syncingSlug === client.slug && "animate-spin"
                          )}
                        />
                        {syncingSlug === client.slug ? t("syncing") : t("sync")}
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <form
        className="grid gap-4 rounded-[15px] border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:p-5"
        onSubmit={handleCreate}
      >
        <div className="sm:col-span-3">
          <h2 className="text-base font-medium">{t("createClientTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("createClientDescription")}
          </p>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("companyName")}</span>
          <input
            className={fieldClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("companyNamePlaceholder")}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("slugOptional")}</span>
          <input
            className={fieldClass}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder={t("slugPlaceholder")}
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="h-10 w-full sm:w-auto" disabled={creating}>
            {creating ? t("creating") : t("createClient")}
          </Button>
        </div>
      </form>
    </div>
  )
}
