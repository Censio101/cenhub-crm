"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import {
  ExternalLinkIcon,
  LayoutGridIcon,
  ListIcon,
  RefreshCwIcon,
  Settings2Icon,
} from "lucide-react"

import { AdminHubToolbar } from "@/components/admin/AdminHubToolbar"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import {
  hubClientInEnabledTab,
  hubClientInNeedsSetupTab,
  type HubClient,
} from "@/lib/admin/hub-clients"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { outfit, poppins } from "@/lib/fonts/app-fonts"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type ClientFilter = "all" | "enabled" | "needs-setup"
type ClientView = "cards" | "list"

const FILTERS: ClientFilter[] = ["enabled", "needs-setup", "all"]

const FILTER_LABELS: Record<ClientFilter, MessageKey> = {
  enabled: "filterEnabled",
  "needs-setup": "filterNeedsSetup",
  all: "filterAll",
}

const VIEW_STORAGE_KEY = "admin-clients-view"

function formatAdAccountId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`
}

function MetaToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

function hubStatusMeta(client: HubClient, t: (key: MessageKey) => string) {
  if (client.partnerOnly) {
    return { label: t("bmUnlinked"), dot: "bg-amber-400", text: "text-amber-800" }
  }
  if (client.status === "live") {
    return { label: t("statusActive"), dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  if (client.status === "error") {
    return { label: t("statusError"), dot: "bg-red-500", text: "text-red-700" }
  }
  if (hubClientInEnabledTab(client)) {
    return { label: t("filterEnabled"), dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  return { label: t("filterNeedsSetup"), dot: "bg-amber-400", text: "text-amber-800" }
}

export function AdminClientList() {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const [clients, setClients] = useState<HubClient[]>([])
  const [partnerFetchError, setPartnerFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  useAutoDismiss(notice, dismissNotice)

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ClientFilter>("enabled")
  const [view, setView] = useState<ClientView>("cards")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [enablingPartnerId, setEnablingPartnerId] = useState<string | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === "cards" || stored === "list") setView(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

  async function loadClients(silent = false) {
    if (silent) setRefreshing(true)
    else setLoading(true)
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
      setLoading(false)
      setRefreshing(false)
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
        router.push(`/admin/${data.organization.slug}/meta`)
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
    setNotice(null)
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
        router.push(`/admin/${data.organization.slug}/meta`)
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
    setNotice(null)
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationSlug}/meta/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ scope: "all" }),
        }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("syncFailed"))
      await loadClients(true)
      setNotice(t("syncComplete"))
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : t("syncFailed"))
    } finally {
      setSyncingSlug(null)
    }
  }

  async function handleToggleMeta(client: HubClient, enabled: boolean) {
    if (!client.slug) return
    setTogglingSlug(client.slug)
    setError(null)
    setNotice(null)

    setClients((current) =>
      current.map((row) =>
        row.key === client.key ? { ...row, metaEnabled: enabled } : row
      )
    )

    try {
      const response = await fetch(`/api/admin/organizations/${client.slug}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("errorUpdateMetaStatus"))
      await loadClients(true)
      if (enabled) setNotice(t("metaSetupSaved"))
    } catch (toggleError) {
      setClients((current) =>
        current.map((row) =>
          row.key === client.key ? { ...row, metaEnabled: !enabled } : row
        )
      )
      setError(
        toggleError instanceof Error ? toggleError.message : t("errorUpdateMetaStatus")
      )
    } finally {
      setTogglingSlug(null)
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/admin/meta-clients/sync-all", {
        method: "POST",
        credentials: "include",
      })
      const data = (await response.json()) as {
        error?: string
        metricsResults?: Array<{ success?: boolean }>
      }
      if (!response.ok) throw new Error(data.error ?? t("errorSyncAll"))
      await loadClients(true)
      const okCount = (data.metricsResults ?? []).filter((row) => row.success).length
      setNotice(t("facebookDataSynced", { count: okCount }))
    } catch (syncAllError) {
      setError(syncAllError instanceof Error ? syncAllError.message : t("errorSyncAll"))
    } finally {
      setSyncingAll(false)
    }
  }

  function openDashboard(client: HubClient) {
    if (!client.slug) return
    setOpeningSlug(client.slug)
    void openClientDashboard(client.slug, setActiveOrganization, { newTab: true }).finally(
      () => setOpeningSlug(null)
    )
  }

  const quietButtonClass =
    "inline-flex items-center justify-center rounded-[10px] bg-[#faf8f6] px-3.5 py-2.5 text-center text-[13px] font-semibold text-foreground transition-colors hover:bg-[#e8e0d8] disabled:cursor-not-allowed disabled:opacity-65"
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-[10px] bg-primary px-3.5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-[#c4530a] disabled:cursor-wait disabled:opacity-65"
  const iconButtonClass =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#faf8f6] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"

  function renderClientCard(client: HubClient) {
    const displayName = formatClientDisplayName(client.name)
    const isEnabled = hubClientInEnabledTab(client)
    const isLive = client.metaLive
    const isPartnerOnly = client.partnerOnly
    const busy =
      togglingSlug === client.slug ||
      syncingSlug === client.slug ||
      openingSlug === client.slug

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
            {clientInitialsFromName(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg leading-tight font-semibold">{displayName}</h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {isPartnerOnly
                ? formatAdAccountId(client.metaAdAccountId)
                : `/${client.slug}`}
            </p>
          </div>
          {!isPartnerOnly ? (
            <MetaToggle
              checked={client.metaEnabled}
              disabled={busy}
              label={t("metaToggleFor", { name: displayName })}
              onChange={(next) => {
                void handleToggleMeta(client, next)
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          {(() => {
            const status = hubStatusMeta(client, t)
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold",
                  status.text
                )}
              >
                <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden="true" />
                {status.label}
              </span>
            )
          })()}
          {!isPartnerOnly && isEnabled ? (
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
          ) : null}
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
                href={`/admin/${client.slug}/meta`}
                className={isEnabled ? quietButtonClass : primaryButtonClass}
              >
                {t("setting")}
              </Link>
              <button
                type="button"
                className={isEnabled ? primaryButtonClass : quietButtonClass}
                disabled={openingSlug === client.slug}
                onClick={() => openDashboard(client)}
              >
                {openingSlug === client.slug ? t("openingDashboard") : t("openDashboard")}
              </button>
              <button
                type="button"
                className={cn(quietButtonClass, "gap-1.5")}
                disabled={!isLive || syncingSlug === client.slug || busy}
                onClick={() => {
                  if (!client.slug) return
                  void handleSync(client.slug)
                }}
              >
                <RefreshCwIcon
                  className={cn("size-3.5", syncingSlug === client.slug && "animate-spin")}
                />
                {syncingSlug === client.slug ? t("syncing") : t("sync")}
              </button>
            </>
          )}
        </div>
      </article>
    )
  }

  function renderClientRow(client: HubClient) {
    const displayName = formatClientDisplayName(client.name)
    const isPartnerOnly = client.partnerOnly
    const isLive = client.metaLive
    const status = hubStatusMeta(client, t)
    const busy =
      togglingSlug === client.slug ||
      syncingSlug === client.slug ||
      openingSlug === client.slug

    return (
      <li
        key={client.key}
        className="flex flex-col gap-3 border-b border-[#e8e0d8] py-3.5 pr-4 pl-6 last:border-b-0 sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground" title={displayName}>
            {displayName}
          </p>
          {!isPartnerOnly && hubClientInEnabledTab(client) ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {client.leadCount} {t("leads")} · {client.userCount} {t("users")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden="true" />
            <span className={cn("text-sm font-medium", status.text)}>{status.label}</span>
          </div>

          {isPartnerOnly ? (
            <button
              type="button"
              className={cn(primaryButtonClass, "px-3 py-2 text-xs")}
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
              <MetaToggle
                checked={client.metaEnabled}
                disabled={busy}
                label={t("metaToggleFor", { name: displayName })}
                onChange={(next) => {
                  void handleToggleMeta(client, next)
                }}
              />
              <Link
                href={`/admin/${client.slug}/meta`}
                className={iconButtonClass}
                aria-label={t("editClient", { name: displayName })}
                title={t("setting")}
              >
                <Settings2Icon className="size-4" />
              </Link>
              <button
                type="button"
                className={iconButtonClass}
                disabled={openingSlug === client.slug || busy}
                aria-label={t("openDashboard")}
                title={t("openDashboard")}
                onClick={() => openDashboard(client)}
              >
                <ExternalLinkIcon className="size-4" />
              </button>
              <button
                type="button"
                className={iconButtonClass}
                disabled={!isLive || syncingSlug === client.slug || busy}
                aria-label={t("syncFacebookFor", { name: displayName })}
                title={t("sync")}
                onClick={() => {
                  if (!client.slug) return
                  void handleSync(client.slug)
                }}
              >
                <RefreshCwIcon
                  className={cn("size-4", syncingSlug === client.slug && "animate-spin")}
                />
              </button>
            </>
          )}
        </div>
      </li>
    )
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
        actions={
          <>
            <div
              className="meta-hub-filters meta-hub-filters--compact"
              role="group"
              aria-label={t("clientViewAria")}
            >
              <button
                type="button"
                className={cn("meta-hub-filter meta-hub-filter--icon", view === "cards" && "is-active")}
                aria-pressed={view === "cards"}
                aria-label={t("viewCards")}
                title={t("viewCards")}
                onClick={() => setView("cards")}
              >
                <LayoutGridIcon className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn("meta-hub-filter meta-hub-filter--icon", view === "list" && "is-active")}
                aria-pressed={view === "list"}
                aria-label={t("viewList")}
                title={t("viewList")}
                onClick={() => setView("list")}
              >
                <ListIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={syncingAll}
              onClick={() => {
                void handleSyncAll()
              }}
            >
              {syncingAll ? t("syncing") : t("syncAll")}
            </button>
          </>
        }
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
      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <div
          className={cn(
            view === "cards"
              ? "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
              : "overflow-hidden rounded-2xl border border-[#d3c3b2] bg-card"
          )}
          aria-busy="true"
          aria-live="polite"
        >
          <p className="sr-only">{t("loadingClients")}</p>
          {view === "cards" ? (
            Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl bg-card p-[18px] shadow-sm"
              >
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
                  <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
                  <div className="h-10 animate-pulse rounded-[10px] bg-muted" />
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-0">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-14 animate-pulse border-b border-[#e8e0d8] bg-muted/30" />
              ))}
            </div>
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d3c3b2] bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {clients.length === 0 ? t("noClientsYet") : t("noMatchingClients")}
        </p>
      ) : view === "cards" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {visible.map(renderClientCard)}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#d3c3b2] bg-card">
          <ul>{visible.map(renderClientRow)}</ul>
        </section>
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
