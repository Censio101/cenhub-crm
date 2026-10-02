"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PlusIcon, WebhookIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { FunnelDetail } from "@/components/admin/funnels/FunnelDetail"
import { FunnelSheetBanner, FunnelStaleNotice } from "@/components/admin/funnels/FunnelSheetBanner"
import { NewFunnelDialog } from "@/components/admin/funnels/NewFunnelDialog"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { FUNNEL_TARGET_PREFIX, findDanglingCustomTargets } from "@/lib/lead-sheet/mapping-review"
import type { WebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

function FunnelsPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-shimmer h-10 w-36 rounded-xl" />
        ))}
      </div>
      <div className={cn(adminSectionCardClass, "space-y-4 p-5")}>
        <div className="skeleton-shimmer h-7 w-56 rounded-md" />
        <div className="skeleton-shimmer h-10 w-64 rounded-xl" />
        <div className="skeleton-shimmer h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function AdminClientFunnelsPanel() {
  const { slug } = useAdminClient()
  const { t } = useLanguage()
  const [funnels, setFunnels] = useState<FunnelDto[]>([])
  const [leadSheet, setLeadSheet] = useState<WebhookLeadSheetInfo | null>(null)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FunnelDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  const webhookBase = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
    if (configured) return configured
    if (typeof window !== "undefined") return window.location.origin
    return ""
  }, [])

  const webhookUrl = useCallback(
    (funnelId: string) => (webhookBase ? `${webhookBase}/api/webhooks/funnels/${funnelId}` : ""),
    [webhookBase]
  )

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!slug) return
      if (!options?.silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const response = await fetch(`/api/admin/organizations/${slug}/funnels`)
        if (!response.ok) throw new Error("load")
        const data = (await response.json()) as {
          funnels: FunnelDto[]
          leadSheet: WebhookLeadSheetInfo | null
          webhookStaleSince?: string | null
        }
        setFunnels(data.funnels)
        setLeadSheet(data.leadSheet ?? null)
        setStaleSince(data.webhookStaleSince ?? null)
      } catch {
        if (!options?.silent) setError(t("funnelsLoadError"))
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [slug, t]
  )

  useAsyncEffect(() => {
    void load()
  }, [load])

  // The first webhook is open by default; a removed one falls back to the first.
  const selected = funnels.find((funnel) => funnel.id === selectedId) ?? funnels[0] ?? null
  const customKeys = useMemo(() => (leadSheet?.customFields ?? []).map((f) => f.key), [leadSheet])

  /** Returns an error message for the popup, or `null` once the webhook exists. */
  async function createFunnel(input: {
    name: string
    platform: FunnelDto["platform"]
  }): Promise<string | null> {
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error("create")
      const data = (await response.json()) as { funnel: FunnelDto }
      await load({ silent: true })
      setSelectedId(data.funnel.id)
      setShowCreate(false)
      setNotice(t("funnelSaved"))
      return null
    } catch {
      return t("funnelsLoadError")
    }
  }

  async function regenerateSecret(funnelId: string) {
    const response = await fetch(`/api/admin/organizations/${slug}/funnels/${funnelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateSecret: true }),
    })
    if (!response.ok) {
      setError(t("funnelsLoadError"))
      return
    }
    setNotice(t("funnelSaved"))
    await load({ silent: true })
  }

  async function toggleEnabled(funnelId: string, enabled: boolean) {
    patchFunnel(funnelId, { enabled })
    const response = await fetch(`/api/admin/organizations/${slug}/funnels/${funnelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    if (!response.ok) {
      patchFunnel(funnelId, { enabled: !enabled })
      setError(t("funnelsLoadError"))
    }
  }

  async function acknowledgeSheetChange() {
    setAcknowledging(true)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/funnels/acknowledge-sheet-change`,
        { method: "POST" }
      )
      if (!response.ok) throw new Error("acknowledge")
      setStaleSince(null)
    } catch {
      setError(t("funnelsLoadError"))
    } finally {
      setAcknowledging(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("delete")
      setNotice(t("funnelDeleted"))
      await load({ silent: true })
    } catch {
      setError(t("funnelsLoadError"))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current)
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
      if (copiedTimerRef.current != null) window.clearTimeout(copiedTimerRef.current)
    }
  }, [])

  /** Keeps the list in step with what the open webhook just changed (mapping, sample, on/off). */
  const patchFunnel = useCallback((id: string, patch: Partial<FunnelDto>) => {
    setFunnels((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const newButton = (
    <Button type="button" className="gap-2" onClick={() => setShowCreate(true)}>
      <PlusIcon className="size-4" aria-hidden />
      {t("funnelNew")}
    </Button>
  )

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{t("funnelsAdminTitle")}</h2>
        {funnels.length > 0 ? newButton : null}
      </header>

      <FormNoticeStack
        error={error}
        success={notice}
        onDismissError={() => setError(null)}
        onDismissSuccess={() => setNotice(null)}
        dismissLabel={t("noticeDismiss")}
        size={adminFormNoticeDefaults.size}
        successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
        errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
      />

      {staleSince && funnels.length > 0 ? (
        <FunnelStaleNotice
          staleSince={staleSince}
          busy={acknowledging}
          onAcknowledge={() => void acknowledgeSheetChange()}
        />
      ) : null}

      {leadSheet ? <FunnelSheetBanner slug={slug} leadSheet={leadSheet} /> : null}

      {loading && funnels.length === 0 ? (
        <>
          <p className="sr-only">{t("loading")}</p>
          <FunnelsPanelSkeleton />
        </>
      ) : funnels.length === 0 ? (
        <div
          className={cn(
            adminSectionCardClass,
            "flex flex-col items-center gap-4 px-6 py-14 text-center"
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#faf8f6] text-primary">
            <WebhookIcon className="size-7" aria-hidden />
          </span>
          <p className="text-base font-semibold">{t("funnelEmptyTitle")}</p>
          {newButton}
        </div>
      ) : (
        <div className="space-y-4">
          <ul
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
            aria-label={t("funnelsAdminTitle")}
          >
            {funnels.map((funnel) => {
              const active = funnel.id === selected?.id
              const dangling = findDanglingCustomTargets(
                funnel.fieldMapping,
                FUNNEL_TARGET_PREFIX,
                customKeys
              ).length
              return (
                <li key={funnel.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setSelectedId(funnel.id)}
                    className={cn(
                      "flex max-w-[16rem] items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
                      active
                        ? "border-primary bg-white text-foreground ring-2 ring-primary/15"
                        : "border-[#e2d6c8] bg-card/70 text-muted-foreground hover:border-primary/50 hover:bg-white hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        funnel.enabled ? "bg-emerald-500" : "bg-[#d9cfc3]"
                      )}
                      title={funnel.enabled ? t("funnelEnabled") : t("funnelDisabled")}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{funnel.name}</span>
                    {dangling > 0 ? (
                      <span
                        className="size-2 shrink-0 rounded-full bg-amber-500"
                        title={t("funnelMappingAttention").replace("{count}", String(dangling))}
                        aria-label={t("funnelMappingAttention").replace(
                          "{count}",
                          String(dangling)
                        )}
                      />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <FunnelDetail
              key={selected.id}
              slug={slug}
              funnel={selected}
              url={webhookUrl(selected.id)}
              leadSheet={leadSheet}
              copiedKey={copiedKey}
              onCopy={(key, value) => void copyText(key, value)}
              onRegenerateSecret={() => void regenerateSecret(selected.id)}
              onFunnelChange={(patch) => patchFunnel(selected.id, patch)}
              onToggleEnabled={(enabled) => void toggleEnabled(selected.id, enabled)}
              onDelete={() => setDeleteTarget(selected)}
            />
          ) : null}
        </div>
      )}

      {showCreate ? (
        <NewFunnelDialog onCreate={createFunnel} onClose={() => setShowCreate(false)} />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          destructive
          title={t("funnelDeleteTitle").replace("{name}", deleteTarget.name)}
          message={t("funnelDeleteBody")}
          confirmLabel={t("funnelDelete")}
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
