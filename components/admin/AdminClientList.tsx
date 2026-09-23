"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { RefreshCwIcon, SearchIcon } from "lucide-react"

import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type ClientFilter = "all" | "enabled" | "needs-setup"

const FILTERS: ClientFilter[] = ["all", "enabled", "needs-setup"]

const FILTER_LABELS: Record<ClientFilter, MessageKey> = {
  all: "filterAll",
  enabled: "filterLive",
  "needs-setup": "filterNotLive",
}

type OrganizationSummary = {
  id: string
  slug: string
  name: string
  demo_mode: boolean
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

function clientInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function AdminClientList() {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ClientFilter>("all")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)

  async function loadOrganizations(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations", { cache: "no-store" })
      if (!response.ok) throw new Error(t("errorFetchClients"))
      const data = (await response.json()) as { organizations: OrganizationSummary[] }
      setOrganizations(data.organizations)
    } catch (loadError) {
      console.error(loadError)
      setError(t("errorLoadClients"))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return organizations
      .filter((organization) => {
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "enabled"
              ? organization.metaEnabled
              : !organization.metaEnabled
        if (!matchesFilter) return false
        if (!needle) return true
        return `${organization.name} ${organization.slug}`.toLowerCase().includes(needle)
      })
      .sort((left, right) => {
        if (filter === "all" && left.metaEnabled !== right.metaEnabled) {
          return left.metaEnabled ? -1 : 1
        }
        return left.name.localeCompare(right.name, "da")
      })
  }, [filter, organizations, query])

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
      await loadOrganizations(true)
      if (data.organization?.slug) {
        router.push(`/admin/${data.organization.slug}`)
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("errorCreate"))
    } finally {
      setCreating(false)
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
      await loadOrganizations(true)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncingSlug(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("brand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          {t("clientsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("clientsDescription")}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className={cn(
              fieldClass,
              "border-[#d3c3b2] pl-9 focus:border-primary focus:ring-primary"
            )}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchClients")}
            aria-label={t("searchClients")}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                filter === value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setFilter(value)}
            >
              {t(FILTER_LABELS[value])}
            </button>
          ))}
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loadingClients")}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("clientsCount", { count: visible.length })}
            </p>
          )}
        </div>
      </div>

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
          {organizations.length === 0 ? t("noClientsYet") : t("noMatchingClients")}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {visible.map((organization) => {
            const isLive = organization.metaEnabled
            const quietButtonClass =
              "inline-flex items-center justify-center rounded-[10px] bg-[#faf8f6] px-3.5 py-2.5 text-center text-[13px] font-semibold text-foreground transition-colors hover:bg-[#e8e0d8] disabled:cursor-not-allowed disabled:opacity-65"
            const primaryButtonClass =
              "inline-flex items-center justify-center rounded-[10px] bg-primary px-3.5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-[#c4530a] disabled:cursor-wait disabled:opacity-65"

            return (
              <article
                key={organization.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border border-[#d3c3b2] bg-card p-[18px]",
                  isLive
                    ? "shadow-[0_1px_3px_rgba(26,18,8,0.06)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(26,18,8,0.12)]"
                    : "shadow-[0_1px_2px_rgba(26,18,8,0.04)]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-[15px] font-semibold tracking-wide text-white"
                    aria-hidden="true"
                  >
                    {clientInitials(organization.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg leading-tight font-semibold">
                      {organization.name}
                    </h2>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      /{organization.slug}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold",
                      isLive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {isLive ? t("filterLive") : t("filterNotLive")}
                  </span>
                  {isLive ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {organization.leadCount} {t("leads")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {organization.userCount} {t("users")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t("metaNotConnected")}</span>
                    </>
                  )}
                </div>

                <div className="mt-1 grid grid-cols-3 gap-2">
                  <Link
                    href={`/admin/${organization.slug}`}
                    className={isLive ? quietButtonClass : primaryButtonClass}
                  >
                    {t("setting")}
                  </Link>
                  <button
                    type="button"
                    className={isLive ? primaryButtonClass : quietButtonClass}
                    disabled={openingSlug === organization.slug}
                    onClick={() => {
                      setOpeningSlug(organization.slug)
                      void openClientDashboard(
                        organization.slug,
                        setActiveOrganization,
                        router
                      ).finally(() => setOpeningSlug(null))
                    }}
                  >
                    {openingSlug === organization.slug
                      ? t("openingDashboard")
                      : t("openDashboard")}
                  </button>
                  <button
                    type="button"
                    className={cn(quietButtonClass, "gap-1.5")}
                    disabled={!isLive || syncingSlug === organization.slug}
                    onClick={() => {
                      void handleSync(organization.slug)
                    }}
                  >
                    <RefreshCwIcon
                      className={cn(
                        "size-3.5",
                        syncingSlug === organization.slug && "animate-spin"
                      )}
                    />
                    {syncingSlug === organization.slug ? t("syncing") : t("sync")}
                  </button>
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
