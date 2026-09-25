"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDownIcon,
  CopyIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import {
  adminFieldClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CANONICAL_INBOUND_EXAMPLE } from "@/lib/leads/inbound-payload"
import { cn } from "cn"

type FunnelDto = {
  id: string
  name: string
  slug: string
  platform: "website" | "landing" | "manual"
  enabled: boolean
  fieldMapping: Record<string, string>
  webhookSecret: string
}

const EXAMPLE_JSON = JSON.stringify(CANONICAL_INBOUND_EXAMPLE, null, 2)

const readOnlyFieldClass =
  "min-w-0 flex-1 rounded-xl border border-[#e8e0d8] bg-[#faf8f5] px-3 py-2 font-mono text-xs text-foreground outline-none sm:text-[13px]"

function FunnelsPanelSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className={cn(adminSectionCardClass, "flex items-center gap-3 p-3 sm:px-4")}
        >
          <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 max-w-[14rem] animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  )
}

function platformLabel(
  platform: FunnelDto["platform"],
  t: (key: "funnelPlatformWebsite" | "funnelPlatformLanding" | "funnelPlatformManual") => string
) {
  switch (platform) {
    case "landing":
      return t("funnelPlatformLanding")
    case "manual":
      return t("funnelPlatformManual")
    default:
      return t("funnelPlatformWebsite")
  }
}

export function AdminClientFunnelsPanel() {
  const { slug } = useAdminClient()
  const { t } = useLanguage()
  const [funnels, setFunnels] = useState<FunnelDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copiedTimerRef = useRef<number | null>(null)
  const [newName, setNewName] = useState("")
  const [newPlatform, setNewPlatform] = useState<FunnelDto["platform"]>("website")
  const webhookBase = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
    if (configured) return configured
    if (typeof window !== "undefined") return window.location.origin
    return ""
  }, [])

  const webhookUrl = useCallback(
    (funnelId: string) =>
      webhookBase ? `${webhookBase}/api/webhooks/funnels/${funnelId}` : "",
    [webhookBase]
  )

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!slug) return
    if (!options?.silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels`)
      if (!response.ok) throw new Error("load")
      const data = (await response.json()) as { funnels: FunnelDto[] }
      setFunnels(data.funnels)
      if (data.funnels.length === 0) setShowCreate(true)
    } catch {
      if (!options?.silent) setError(t("funnelsLoadError"))
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [slug, t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!slug || !newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), platform: newPlatform }),
      })
      if (!response.ok) throw new Error("create")
      const data = (await response.json()) as { funnel: FunnelDto }
      setNotice(t("funnelSaved"))
      setNewName("")
      setShowCreate(false)
      setExpandedId(data.funnel.id)
      await load({ silent: true })
    } catch {
      setError(t("funnelsLoadError"))
    } finally {
      setCreating(false)
    }
  }

  async function regenerateSecret(funnelId: string) {
    if (!slug) return
    const response = await fetch(
      `/api/admin/organizations/${slug}/funnels/${funnelId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateSecret: true }),
      }
    )
    if (!response.ok) {
      setError(t("funnelsLoadError"))
      return
    }
    setNotice(t("funnelSaved"))
    await load({ silent: true })
  }

  async function removeFunnel(id: string) {
    if (!slug || !window.confirm(t("funnelDeleteConfirm"))) return
    await fetch(`/api/admin/organizations/${slug}/funnels/${id}`, {
      method: "DELETE",
    })
    setNotice(t("funnelDeleted"))
    if (expandedId === id) setExpandedId(null)
    await load({ silent: true })
  }

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      if (copiedTimerRef.current != null) {
        window.clearTimeout(copiedTimerRef.current)
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null)
        copiedTimerRef.current = null
      }, 2000)
    } catch {
      setError(t("funnelsLoadError"))
    }
  }

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) {
        window.clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{t("funnelsAdminTitle")}</h2>
        {loading && funnels.length === 0 ? (
          <div className="h-9 w-28 animate-pulse rounded-[10px] bg-muted sm:ml-auto" aria-hidden />
        ) : !showCreate && funnels.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon className="size-4" />
            {t("funnelsAdd")}
          </Button>
        ) : null}
      </header>

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

      {showCreate ? (
        <form
          onSubmit={(event) => void handleCreate(event)}
          className={cn(adminSectionCardClass, "grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end")}
        >
          <label className="block min-w-0 space-y-1.5 text-sm sm:col-span-1">
            <span className="font-medium">{t("funnelsSourceNameLabel")}</span>
            <input
              className={adminFieldClass}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={t("funnelsSourceNamePlaceholder")}
              required
            />
          </label>
          <label className="block min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">{t("funnelPlatform")}</span>
            <Select
              value={newPlatform}
              onValueChange={(value) => {
                if (value === "website" || value === "landing" || value === "manual") {
                  setNewPlatform(value)
                }
              }}
            >
              <SelectTrigger className={cn(adminFieldClass, "min-w-[10rem]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">{t("funnelPlatformWebsite")}</SelectItem>
                <SelectItem value="landing">{t("funnelPlatformLanding")}</SelectItem>
                <SelectItem value="manual">{t("funnelPlatformManual")}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="submit" disabled={creating || !newName.trim()}>
              {creating ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {t("funnelSave")}
            </Button>
            {funnels.length > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                {t("noticeDismiss")}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {loading && funnels.length === 0 ? (
        <>
          <p className="sr-only">{t("loading")}</p>
          <FunnelsPanelSkeleton />
        </>
      ) : funnels.length === 0 && !showCreate ? (
        <p className={cn(adminSectionCardClass, "px-4 py-8 text-center text-sm text-muted-foreground")}>
          {t("funnelsEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {funnels.map((funnel) => {
            const open = expandedId === funnel.id
            const url = webhookUrl(funnel.id)
            const urlCopyKey = `${funnel.id}-url`
            const secretCopyKey = `${funnel.id}-secret`
            const jsonCopyKey = `${funnel.id}-json`

            return (
              <li key={funnel.id} className={cn(adminSectionCardClass, "overflow-hidden")}>
                <div className="flex items-center gap-2 p-3 sm:px-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={open}
                    onClick={() => toggleExpanded(funnel.id)}
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{funnel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {platformLabel(funnel.platform, t)}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={t("funnelDelete")}
                    onClick={(event) => {
                      event.stopPropagation()
                      void removeFunnel(funnel.id)
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>

                {open ? (
                  <div className="space-y-4 border-t border-[#e8e0d8] px-3 pb-4 pt-3 sm:px-4">
                    <div className="rounded-xl border border-primary/25 bg-[#fff8f3] p-3 sm:p-4">
                      <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                        {t("funnelWebhookUrl")}
                      </p>
                      <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-foreground">
                        {url}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn("mt-3", adminOutlineButtonClass)}
                        onClick={() => void copyText(urlCopyKey, url)}
                      >
                        <CopyIcon className="size-4" />
                        {copiedKey === urlCopyKey ? t("funnelCopied") : t("funnelCopyWebhook")}
                      </Button>
                    </div>

                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium text-foreground">{t("funnelSecret")}</span>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          className={readOnlyFieldClass}
                          value={funnel.webhookSecret}
                          aria-label={t("funnelSecret")}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn("shrink-0", adminOutlineButtonClass)}
                          aria-label={t("funnelCopySecret")}
                          title={
                            copiedKey === secretCopyKey ? t("funnelCopied") : t("funnelCopySecret")
                          }
                          onClick={() => void copyText(secretCopyKey, funnel.webhookSecret)}
                        >
                          <CopyIcon className="size-4" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        onClick={() => void regenerateSecret(funnel.id)}
                      >
                        {t("funnelRegenerateSecret")}
                      </button>
                    </label>

                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-foreground">
                        {t("funnelCanonicalDoc")}
                      </summary>
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={adminOutlineButtonClass}
                          onClick={() => void copyText(jsonCopyKey, EXAMPLE_JSON)}
                        >
                          <CopyIcon className="size-4" />
                          {copiedKey === jsonCopyKey ? t("funnelCopied") : t("funnelCopyJson")}
                        </Button>
                      </div>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-[#e8e0d8] bg-[#faf8f5] p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {EXAMPLE_JSON}
                      </pre>
                      <p className="mt-2 text-xs text-muted-foreground">{t("funnelAuthHeaderHint")}</p>
                    </details>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
