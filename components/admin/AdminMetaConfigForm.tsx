"use client"

import { FormEvent, useEffect, useState } from "react"

import { AdminCardSkeleton } from "@/components/admin/AdminSkeletons"
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
}

export function AdminMetaConfigForm({ slug }: { slug: string }) {
  const [config, setConfig] = useState<MetaConfig>({
    metaAdAccountId: "",
    metaPageId: "",
    metaPixelId: "",
    enabled: false,
    metaSyncStatus: "disabled",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch(`/api/admin/organizations/${slug}/meta`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.config) setConfig(data.config)
      })
      .finally(() => setLoading(false))
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

  if (loading) {
    return <AdminCardSkeleton label="Indlæser Meta opsætning" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta opsætning</CardTitle>
        <CardDescription>
          Gem annoncekonto og side-ID nu. Sync og test kommer i Phase 4.
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
          <p className="rounded-[15px] bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
            Sync status: {config.metaSyncStatus}. Automatisk sync er deaktiveret indtil Phase 4.
          </p>
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
          <Button type="submit" className="h-10 w-fit" disabled={saving}>
            {saving ? "Gemmer…" : "Gem Meta opsætning"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
