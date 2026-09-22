"use client"

import Link from "next/link"
import { RefreshCwIcon, Settings2Icon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminNav } from "@/components/admin/AdminNav"
import { Button } from "@/components/ui/button"
import { deriveMetaClientStatus } from "@/lib/db/meta-clients-repository"
import { cn } from "cn"

type MetaClient = {
  organizationId: string
  slug: string
  name: string
  demoMode: boolean
  metaAdAccountId: string
  metaPageId: string
  enabled: boolean
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
  needsSetup: boolean
  status: "live" | "off" | "needs-setup" | "error"
  inApp: true
}

type PartnerClient = {
  metaAdAccountId: string
  accountName: string
  currency: string
}

type Filter = "all" | "enabled" | "needs-setup"

type OnboardPayload = {
  pageIdDiscovered?: boolean
  metrics?: {
    success?: boolean
    reason?: string
    monthCount?: number
  } | null
  leads?: {
    imported?: number
  } | null
}

function formatOnboardNotice(name: string, onboard: OnboardPayload | null | undefined) {
  if (!onboard) return `${name} er aktiveret.`

  if (onboard.metrics?.success) {
    const months = onboard.metrics.monthCount ?? 0
    const pageNote = onboard.pageIdDiscovered
      ? " Page ID fundet automatisk."
      : " Tilføj page ID under rediger for leads."
    return `${name} er oprettet — Facebook annoncedata hentet (${months} måneder).${pageNote}`
  }

  if (onboard.metrics?.reason) {
    return `${name} er oprettet, men sync fejlede: ${onboard.metrics.reason}`
  }

  return `${name} er aktiveret.`
}

function statusMeta(client: MetaClient) {
  const { status, enabled, metaSyncStatus, metaAdAccountId, metaPageId } = client

  if (status === "live") {
    return { label: "Aktiv", dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  if (status === "error") {
    return { label: "Fejl", dot: "bg-red-500", text: "text-red-700" }
  }
  if (
    enabled &&
    metaAdAccountId.trim() &&
    metaSyncStatus === "ok" &&
    !metaPageId.trim()
  ) {
    return { label: "Annoncer", dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  if (enabled && status === "needs-setup") {
    return { label: "Setup", dot: "bg-amber-500", text: "text-amber-800" }
  }
  if (status === "needs-setup") {
    return { label: "Setup", dot: "bg-amber-400", text: "text-amber-800" }
  }
  return { label: "Af", dot: "bg-muted-foreground/40", text: "text-muted-foreground" }
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
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

function CompactMetaList({
  clients,
  togglingSlug,
  syncingSlug,
  onToggle,
  onSync,
}: {
  clients: MetaClient[]
  togglingSlug: string | null
  syncingSlug: string | null
  onToggle: (slug: string, enabled: boolean) => Promise<void>
  onSync: (slug: string) => Promise<void>
}) {
  if (!clients.length) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Ingen klienter matcher filteret.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border/70">
      {clients.map((client) => {
        const status = statusMeta(client)
        const canSync = client.enabled && Boolean(client.metaAdAccountId.trim())

        return (
          <li
            key={client.organizationId}
            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20"
          >
            <p
              className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
              title={client.name}
            >
              {client.name}
            </p>

            <div
              className="flex shrink-0 items-center gap-1.5"
              title={client.metaSyncError ?? undefined}
            >
              <span className={cn("size-1.5 rounded-full", status.dot)} />
              <span className={cn("text-xs font-medium", status.text)}>{status.label}</span>
            </div>

            <MetaToggle
              checked={client.enabled}
              disabled={togglingSlug === client.slug || syncingSlug === client.slug}
              label={`Meta for ${client.name}`}
              onChange={(next) => {
                void onToggle(client.slug, next)
              }}
            />

            <button
              type="button"
              disabled={!canSync || syncingSlug === client.slug || togglingSlug === client.slug}
              aria-label={`Sync Facebook data for ${client.name}`}
              title={canSync ? "Hent Facebook-data" : "Kræver ad account"}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                void onSync(client.slug)
              }}
            >
              <RefreshCwIcon
                className={cn("size-3.5", syncingSlug === client.slug && "animate-spin")}
              />
            </button>

            <Link
              href={`/admin/${client.slug}`}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Rediger ${client.name}`}
            >
              <Settings2Icon className="size-3.5" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function PartnerList({
  clients,
  togglingId,
  onEnable,
}: {
  clients: PartnerClient[]
  togglingId: string | null
  onEnable: (client: PartnerClient) => Promise<void>
}) {
  if (!clients.length) return null

  return (
    <div className="border-t border-border">
      <p className="bg-muted/30 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        BM — ikke tilknyttet
      </p>
      <ul className="divide-y divide-border/70">
        {clients.map((client) => (
          <li
            key={client.metaAdAccountId}
            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20"
          >
            <p className="min-w-0 flex-1 truncate text-sm font-medium" title={client.accountName}>
              {client.accountName}
            </p>
            <MetaToggle
              checked={false}
              disabled={togglingId === client.metaAdAccountId}
              label={`Aktiver Meta for ${client.accountName}`}
              onChange={(next) => {
                if (next) void onEnable(client)
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminMetaHub() {
  const [clients, setClients] = useState<MetaClient[]>([])
  const [partnerClients, setPartnerClients] = useState<PartnerClient[]>([])
  const [partnerFetchError, setPartnerFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)
  const [togglingPartnerId, setTogglingPartnerId] = useState<string | null>(null)
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/meta-clients", {
        cache: "no-store",
        credentials: "include",
      })
      const data = (await response.json()) as {
        error?: string
        clients?: MetaClient[]
        unlinkedPartnerAccounts?: PartnerClient[]
        meta?: { partnerFetchError?: string | null }
      }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke hente Meta klienter")
      setClients(data.clients ?? [])
      setPartnerClients(data.unlinkedPartnerAccounts ?? [])
      setPartnerFetchError(data.meta?.partnerFetchError ?? null)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Kunne ikke hente Meta klienter"
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()
    return clients
      .filter((client) => {
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "enabled"
              ? client.enabled
              : client.needsSetup || client.status === "error"

        if (!matchesFilter) return false
        if (!query) return true

        return [client.name, client.slug, client.metaAdAccountId, client.metaPageId]
          .join(" ")
          .toLowerCase()
          .includes(query)
      })
      .sort((left, right) => {
        if (left.enabled !== right.enabled) return left.enabled ? -1 : 1
        return left.name.localeCompare(right.name, "da")
      })
  }, [clients, filter, search])

  const filteredPartnerClients = useMemo(() => {
    if (filter === "enabled") return []
    const query = search.trim().toLowerCase()
    return partnerClients.filter((client) => {
      if (!query) return true
      return [client.accountName, client.metaAdAccountId].join(" ").toLowerCase().includes(query)
    })
  }, [filter, partnerClients, search])

  const counts = useMemo(
    () => ({
      enabled: clients.filter((client) => client.enabled).length,
      total: clients.length,
    }),
    [clients]
  )

  async function handlePartnerEnable(client: PartnerClient) {
    setTogglingPartnerId(client.metaAdAccountId)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/admin/meta-clients/enable-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metaAdAccountId: client.metaAdAccountId,
          accountName: client.accountName,
          enabled: true,
        }),
      })
      const data = (await response.json()) as {
        error?: string
        organization?: { slug?: string }
        onboard?: OnboardPayload
      }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke aktivere Meta klient")

      await load(true)
      setNotice(formatOnboardNotice(client.accountName, data.onboard))
    } catch (enableError) {
      setError(
        enableError instanceof Error ? enableError.message : "Kunne ikke aktivere Meta klient"
      )
    } finally {
      setTogglingPartnerId(null)
    }
  }

  async function handleToggle(slug: string, enabled: boolean) {
    setTogglingSlug(slug)
    setError(null)
    setNotice(null)

    const previous = clients.find((client) => client.slug === slug)
    setClients((current) =>
      current.map((client) => (client.slug === slug ? { ...client, enabled } : client))
    )

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      })
      const data = (await response.json()) as {
        error?: string
        onboard?: OnboardPayload
        config?: {
          enabled?: boolean
          metaSyncStatus?: string
          metaAdAccountId?: string
          metaPageId?: string
        }
      }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke opdatere Meta status")

      const config = data.config
      const derived = deriveMetaClientStatus({
        enabled: config?.enabled ?? enabled,
        metaAdAccountId: config?.metaAdAccountId ?? previous?.metaAdAccountId ?? "",
        metaPageId: config?.metaPageId ?? previous?.metaPageId ?? "",
        metaSyncStatus: config?.metaSyncStatus ?? previous?.metaSyncStatus ?? "disabled",
      })

      setClients((current) =>
        current.map((client) =>
          client.slug === slug
            ? {
                ...client,
                enabled: config?.enabled ?? enabled,
                metaAdAccountId: config?.metaAdAccountId ?? client.metaAdAccountId,
                metaPageId: config?.metaPageId ?? client.metaPageId,
                metaSyncStatus: config?.metaSyncStatus ?? client.metaSyncStatus,
                needsSetup: derived.needsSetup,
                status: derived.status,
              }
            : client
        )
      )

      if (enabled) {
        setNotice(formatOnboardNotice(previous?.name ?? slug, data.onboard))
        await load(true)
      }
    } catch (toggleError) {
      setClients((current) =>
        current.map((client) =>
          client.slug === slug ? { ...client, enabled: !enabled } : client
        )
      )
      setError(
        toggleError instanceof Error ? toggleError.message : "Kunne ikke opdatere Meta status"
      )
    } finally {
      setTogglingSlug(null)
    }
  }

  async function handleSync(slug: string) {
    setSyncingSlug(slug)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scope: "all" }),
      })
      const data = (await response.json()) as {
        error?: string
        metrics?: { success?: boolean; reason?: string; monthCount?: number }
        leads?: { imported?: number }
      }
      if (!response.ok) throw new Error(data.error ?? "Sync fejlede")

      await load(true)

      if (data.metrics?.success) {
        setNotice(
          `Facebook-data hentet (${data.metrics.monthCount ?? 0} måneder${
            data.leads?.imported != null ? `, ${data.leads.imported} leads` : ""
          }).`
        )
      } else if (data.metrics?.reason) {
        setError(data.metrics.reason)
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Sync fejlede")
    } finally {
      setSyncingSlug(null)
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
        metricsResults?: Array<{ success?: boolean; organizationId?: string }>
      }
      if (!response.ok) throw new Error(data.error ?? "Sync alle fejlede")

      await load(true)
      const okCount = (data.metricsResults ?? []).filter((row) => row.success).length
      setNotice(`Facebook-data synkroniseret for ${okCount} klienter.`)
    } catch (syncAllError) {
      setError(syncAllError instanceof Error ? syncAllError.message : "Sync alle fejlede")
    } finally {
      setSyncingAll(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Censio Admin
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            Meta klienter
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.enabled} aktive · {counts.total} klienter
          </p>
        </div>
        <AdminNav />
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="h-9 w-full rounded-[12px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring sm:max-w-xs"
          placeholder="Søg klient…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Alle"],
              ["enabled", "Aktive"],
              ["needs-setup", "Setup"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={syncingAll || refreshing}
            onClick={() => {
              void handleSyncAll()
            }}
          >
            {syncingAll ? "Syncer…" : "Sync alle"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={refreshing || syncingAll}
            onClick={() => {
              void load(true)
            }}
          >
            {refreshing ? "…" : "Opdater"}
          </Button>
        </div>
      </div>

      {partnerFetchError ? (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Business Manager: {partnerFetchError}
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

      <section className="dashboard-card overflow-hidden p-0">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Henter…</p>
        ) : (
          <>
            <CompactMetaList
              clients={filteredClients}
              togglingSlug={togglingSlug}
              syncingSlug={syncingSlug}
              onToggle={handleToggle}
              onSync={handleSync}
            />
            <PartnerList
              clients={filteredPartnerClients}
              togglingId={togglingPartnerId}
              onEnable={handlePartnerEnable}
            />
          </>
        )}
      </section>
    </div>
  )
}
