"use client"

import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type MetaConfig = {
  metaAdAccountId: string
  metaPageId: string
  metaPixelId: string
  enabled: boolean
  metaSyncStatus: string
  metaSyncError: string | null
  metaLastSyncedAt: string | null
}

function formatTimestamp(value: string | null) {
  if (!value) return "Aldrig"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("da-DK")
}

export function AdminMetaConfigForm({ slug }: { slug: string }) {
  const [config, setConfig] = useState<MetaConfig>({
    metaAdAccountId: "",
    metaPageId: "",
    metaPixelId: "",
    enabled: false,
    metaSyncStatus: "disabled",
    metaSyncError: null,
    metaLastSyncedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadConfig() {
    const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
      cache: "no-store",
    })
    if (!response.ok) return
    const data = (await response.json()) as { config?: MetaConfig }
    if (data.config) setConfig(data.config)
  }

  useEffect(() => {
    void loadConfig().finally(() => setLoading(false))
  }, [slug])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = (await response.json()) as { error?: string; config?: MetaConfig }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke gemme Meta opsætning")
      if (data.config) setConfig(data.config)
      setMessage("Meta opsætning gemt")
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Kunne ikke gemme Meta opsætning"
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/test`, {
        method: "POST",
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Forbindelse fejlede")
      }
      setMessage(data.message ?? "Forbindelse OK")
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : "Forbindelse fejlede"
      )
    } finally {
      setTesting(false)
    }
  }

  async function handleSyncNow() {
    setSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      })
      const data = (await response.json()) as {
        error?: string
        metrics?: { success?: boolean; reason?: string; monthCount?: number }
        leads?: { imported?: number; scanned?: number; reason?: string }
      }
      if (!response.ok) throw new Error(data.error ?? "Sync fejlede")

      const parts = []
      if (data.metrics?.success) {
        parts.push(`Annonceforbrug: ${data.metrics.monthCount ?? 0} måneder`)
      } else if (data.metrics?.reason) {
        parts.push(`Annonceforbrug: ${data.metrics.reason}`)
      }
      if (typeof data.leads?.imported === "number") {
        parts.push(
          `Leads: ${data.leads.imported} nye (${data.leads.scanned ?? 0} scannet)`
        )
      } else if (data.leads?.reason) {
        parts.push(`Leads: ${data.leads.reason}`)
      }

      setMessage(parts.join(" · ") || "Sync fuldført")
      await loadConfig()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Sync fejlede")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta opsætning</CardTitle>
        <CardDescription>
          Forbind klientens Meta annoncekonto og side. Leads og annonceforbrug
          synkroniseres automatisk, når Meta er aktiveret.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Meta ad account ID</span>
            <input
              className={fieldClass}
              value={config.metaAdAccountId}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  metaAdAccountId: event.target.value,
                }))
              }
              placeholder="act_1234567890"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Meta page ID</span>
            <input
              className={fieldClass}
              value={config.metaPageId}
              onChange={(event) =>
                setConfig((current) => ({ ...current, metaPageId: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Meta pixel ID (valgfri)</span>
            <input
              className={fieldClass}
              value={config.metaPixelId}
              onChange={(event) =>
                setConfig((current) => ({ ...current, metaPixelId: event.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) =>
                setConfig((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            Meta aktiveret for klienten
          </label>
          <div className="rounded-[15px] bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
            <p>Sync status: {config.metaSyncStatus}</p>
            <p>Sidst synkroniseret: {formatTimestamp(config.metaLastSyncedAt)}</p>
            {config.metaSyncError ? (
              <p className="mt-1 text-destructive">{config.metaSyncError}</p>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10" disabled={saving || loading}>
              {saving ? "Gemmer…" : "Gem Meta opsætning"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={testing || loading}
              onClick={() => {
                void handleTestConnection()
              }}
            >
              {testing ? "Tester…" : "Test forbindelse"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={syncing || loading}
              onClick={() => {
                void handleSyncNow()
              }}
            >
              {syncing ? "Syncer…" : "Sync nu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
