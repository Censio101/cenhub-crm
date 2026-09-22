"use client"

import Link from "next/link"
import { ExternalLinkIcon, Settings2Icon } from "lucide-react"
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

function statusMeta(status: MetaClient["status"], enabled: boolean) {
  if (status === "live") {
    return { label: "Aktiv", dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  if (status === "error") {
    return { label: "Fejl", dot: "bg-red-500", text: "text-red-700" }
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
  onToggle,
}: {
  clients: MetaClient[]
  togglingSlug: string | null
  onToggle: (slug: string, enabled: boolean) => Promise<void>
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
        const status = statusMeta(client.status, client.enabled)

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
              disabled={togglingSlug === client.slug}
              label={`Meta for ${client.name}`}
              onChange={(next) => {
                void onToggle(client.slug, next)
              }}
            />

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

function PartnerList({ clients }: { clients: PartnerClient[] }) {
  if (!clients.length) return null

  return (
    <div className="border-t border-border">
      <p className="bg-muted/30 px-4 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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
            <Button
              render={<Link href="/admin" />}
              variant="outline"
              size="xs"
              className="shrink-0 gap-1"
            >
              Tilknyt
              <ExternalLinkIcon className="size-3" />
            </Button>
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

      if (enabled && !(config?.metaPageId ?? previous?.metaPageId)?.trim()) {
        setNotice("Meta er slået til — tilføj page ID under rediger.")
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
            disabled={refreshing}
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
              onToggle={handleToggle}
            />
            <PartnerList clients={filteredPartnerClients} />
          </>
        )}
      </section>
    </div>
  )
}
