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

function formatAdAccount(value: string) {
  const id = String(value || "").trim().replace(/^act_/i, "")
  if (!id) return "—"
  return `act_${id}`
}

function statusMeta(status: MetaClient["status"], enabled: boolean) {
  if (status === "live") {
    return { label: "Aktiv", dot: "bg-emerald-500", text: "text-emerald-700" }
  }
  if (status === "error") {
    return { label: "Fejl", dot: "bg-red-500", text: "text-red-700" }
  }
  if (enabled && status === "needs-setup") {
    return { label: "Mangler page", dot: "bg-amber-500", text: "text-amber-800" }
  }
  if (status === "needs-setup") {
    return { label: "Mangler opsætning", dot: "bg-amber-400", text: "text-amber-800" }
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

function CompactMetaTable({
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
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Ingen klienter matcher filteret.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-3">Klient</th>
            <th className="hidden px-4 py-3 md:table-cell">Ad account</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Meta</th>
            <th className="w-10 px-2 py-3" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const status = statusMeta(client.status, client.enabled)
            const hint =
              client.enabled && !client.metaPageId.trim()
                ? "Tilføj page ID under rediger for at modtage leads"
                : client.enabled && !client.metaAdAccountId.trim()
                  ? "Tilføj ad account ID under rediger"
                  : client.metaSyncError

            return (
              <tr
                key={client.organizationId}
                className="border-b border-border/70 last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{client.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.slug}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {formatAdAccount(client.metaAdAccountId)}
                    </p>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {formatAdAccount(client.metaAdAccountId)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", status.dot)} />
                    <span className={cn("truncate text-xs font-medium", status.text)}>
                      {status.label}
                    </span>
                  </div>
                  {hint ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <MetaToggle
                      checked={client.enabled}
                      disabled={togglingSlug === client.slug}
                      label={`Meta for ${client.name}`}
                      onChange={(next) => {
                        void onToggle(client.slug, next)
                      }}
                    />
                  </div>
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/admin/${client.slug}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Rediger ${client.name}`}
                  >
                    <Settings2Icon className="size-4" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PartnerTable({ clients }: { clients: PartnerClient[] }) {
  if (!clients.length) return null

  return (
    <div className="border-t border-border">
      <div className="bg-muted/30 px-4 py-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Business Manager — ikke tilknyttet CRM
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.metaAdAccountId}
                className="border-b border-border/70 last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5">
                  <p className="truncate font-medium">{client.accountName}</p>
                </td>
                <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                  {formatAdAccount(client.metaAdAccountId)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    render={<Link href="/admin" />}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs"
                  >
                    Tilknyt klient
                    <ExternalLinkIcon className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        setNotice("Meta er slået til. Tilføj page ID under rediger for at modtage leads.")
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
            {counts.enabled} aktive · {counts.total} CRM-klienter
          </p>
        </div>
        <AdminNav />
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="h-9 w-full rounded-[12px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring sm:max-w-xs"
          placeholder="Søg klient eller ad account…"
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
          <p className="px-4 py-8 text-sm text-muted-foreground">Henter Meta klienter…</p>
        ) : (
          <>
            <CompactMetaTable
              clients={filteredClients}
              togglingSlug={togglingSlug}
              onToggle={handleToggle}
            />
            <PartnerTable clients={filteredPartnerClients} />
          </>
        )}
      </section>
    </div>
  )
}
