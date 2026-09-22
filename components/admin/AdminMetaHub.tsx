"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminNav } from "@/components/admin/AdminNav"
import { Button } from "@/components/ui/button"
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
  needsSetup: true
  inApp: false
  status: "needs-setup"
}

type Filter = "all" | "enabled" | "needs-setup"

function formatTimestamp(value: string | null) {
  if (!value) return "Aldrig"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("da-DK")
}

function statusBadge(status: MetaClient["status"] | PartnerClient["status"]) {
  switch (status) {
    case "live":
      return { label: "Meta aktiv", className: "bg-emerald-100 text-emerald-800" }
    case "off":
      return { label: "Meta af", className: "bg-muted text-muted-foreground" }
    case "error":
      return { label: "Fejl", className: "bg-red-100 text-red-800" }
    default:
      return { label: "Mangler opsætning", className: "bg-amber-100 text-amber-900" }
  }
}

function MetaClientCard({
  client,
  onToggle,
  toggling,
}: {
  client: MetaClient
  onToggle: (slug: string, enabled: boolean) => Promise<void>
  toggling: boolean
}) {
  const badge = statusBadge(client.status)
  const canToggle = !client.needsSetup

  return (
    <article className="rounded-[15px] border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/${client.slug}`}
              className="text-base font-medium hover:text-primary"
            >
              {client.name}
            </Link>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{client.slug}</p>
          <dl className="grid gap-1 text-sm text-muted-foreground">
            <div>
              Ad account:{" "}
              <span className="text-foreground">
                {client.metaAdAccountId ? `act_${client.metaAdAccountId.replace(/^act_/i, "")}` : "—"}
              </span>
            </div>
            <div>
              Page ID:{" "}
              <span className="text-foreground">{client.metaPageId || "—"}</span>
            </div>
            <div>
              Sidst synkroniseret:{" "}
              <span className="text-foreground">
                {formatTimestamp(client.metaLastSyncedAt)}
              </span>
            </div>
            {client.metaSyncError ? (
              <div className="text-destructive">{client.metaSyncError}</div>
            ) : null}
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={client.enabled}
              disabled={!canToggle || toggling}
              onChange={(event) => {
                void onToggle(client.slug, event.target.checked)
              }}
            />
            Meta aktiveret
          </label>
          {!canToggle ? (
            <p className="max-w-xs text-xs text-muted-foreground">
              Tilføj ad account og page ID under Rediger før aktivering.
            </p>
          ) : null}
          <Button
            render={<Link href={`/admin/${client.slug}`} />}
            variant="outline"
            className="h-9"
          >
            Rediger opsætning
          </Button>
        </div>
      </div>
    </article>
  )
}

function PartnerClientCard({ client }: { client: PartnerClient }) {
  const badge = statusBadge(client.status)

  return (
    <article className="rounded-[15px] border border-dashed border-border bg-card/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium">{client.accountName}</p>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            act_{client.metaAdAccountId.replace(/^act_/i, "")} · {client.currency}
          </p>
          <p className="text-sm text-muted-foreground">
            Fundet i Meta Business Manager, men ikke knyttet til en CRM-klient endnu.
          </p>
        </div>
        <Button render={<Link href="/admin" />} variant="outline" className="h-9">
          Opret / vælg klient
        </Button>
      </div>
    </article>
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

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/meta-clients", { cache: "no-store" })
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
    return clients.filter((client) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "enabled"
            ? client.enabled && !client.needsSetup
            : client.needsSetup || client.status === "error"

      if (!matchesFilter) return false
      if (!query) return true

      return [client.name, client.slug, client.metaAdAccountId, client.metaPageId]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [clients, filter, search])

  const filteredPartnerClients = useMemo(() => {
    if (filter === "enabled") return []
    const query = search.trim().toLowerCase()
    return partnerClients.filter((client) => {
      if (filter === "needs-setup" && !client.needsSetup) return false
      if (!query) return true
      return [client.accountName, client.metaAdAccountId].join(" ").toLowerCase().includes(query)
    })
  }, [filter, partnerClients, search])

  async function handleToggle(slug: string, enabled: boolean) {
    setTogglingSlug(slug)
    setClients((current) =>
      current.map((client) =>
        client.slug === slug ? { ...client, enabled } : client
      )
    )

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = (await response.json()) as { error?: string; config?: { enabled?: boolean; metaSyncStatus?: string } }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke opdatere Meta status")

      setClients((current) =>
        current.map((client) =>
          client.slug === slug
            ? {
                ...client,
                enabled: data.config?.enabled ?? enabled,
                metaSyncStatus: data.config?.metaSyncStatus ?? client.metaSyncStatus,
                status: enabled ? (client.needsSetup ? "needs-setup" : "live") : "off",
              }
            : client
        )
      )
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Censio Admin
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            Meta klienter
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Se alle klienter med Meta-opsætning, slå sync til eller fra, og find
            konti fra Business Manager der mangler opsætning.
          </p>
        </div>
        <AdminNav />
      </header>

      <div className="flex flex-col gap-3 rounded-[15px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring sm:max-w-sm"
          placeholder="Søg navn, slug eller ad account…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Alle"],
              ["enabled", "Aktive"],
              ["needs-setup", "Mangler opsætning"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
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
            className="h-9"
            disabled={refreshing}
            onClick={() => {
              void load(true)
            }}
          >
            {refreshing ? "Opdaterer…" : "Opdater"}
          </Button>
        </div>
      </div>

      {partnerFetchError ? (
        <p className="rounded-[15px] bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Meta Business Manager: {partnerFetchError}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Henter Meta klienter…</p>
        ) : filteredClients.length === 0 && filteredPartnerClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen Meta klienter matcher filteret.</p>
        ) : (
          <>
            {filteredClients.map((client) => (
              <MetaClientCard
                key={client.organizationId}
                client={client}
                toggling={togglingSlug === client.slug}
                onToggle={handleToggle}
              />
            ))}
            {filteredPartnerClients.map((client) => (
              <PartnerClientCard key={client.metaAdAccountId} client={client} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
