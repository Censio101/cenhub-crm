"use client"

import { useState } from "react"
import { LayoutDashboardIcon, PencilIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { ModalShell } from "@/components/admin/ModalShell"
import {
  adminIconBoxClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { MetricId } from "@/lib/performance/types"
import { cn } from "cn"

function MetricSwitch({
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
        checked ? "bg-emerald-600" : "bg-[#d3c3b2]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

/** Clear On / Off badge: green dot and text when on, grey when off. */
function StatusPill({ on }: { on: boolean }) {
  const { t } = useLanguage()
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold",
        on
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[#e0d7cc] bg-[#f4f0ea] text-muted-foreground"
      )}
    >
      <span
        className={cn("size-2 rounded-full", on ? "bg-emerald-600" : "bg-[#b9ada0]")}
        aria-hidden="true"
      />
      {on ? t("dashboardMetricsOn") : t("dashboardMetricsOff")}
    </span>
  )
}

/**
 * Per-client dashboard KPI visibility (Censio admin). Only POAS can be hidden today.
 * The card shows the status; changing it happens in a dialog so it is never flipped by accident.
 */
export function AdminClientDashboardMetricsSection() {
  const { t } = useLanguage()
  const { slug } = useAdminClient()
  const { reload: reloadSession } = useActiveOrganization()
  const [hidden, setHidden] = useState<MetricId[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draftVisible, setDraftVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useAsyncEffect(async (signal) => {
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/dashboard-metrics`, {
        cache: "no-store",
      })
      const data = (await response.json()) as { hiddenMetrics?: MetricId[] }
      if (signal.cancelled) return
      if (response.ok) setHidden(data.hiddenMetrics ?? [])
      else setLoadError(true)
    } catch {
      if (!signal.cancelled) setLoadError(true)
    } finally {
      if (!signal.cancelled) setLoaded(true)
    }
  }, [slug])

  const poasVisible = !hidden.includes("profit")

  function openDialog() {
    setDraftVisible(poasVisible)
    setError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setError(null)
  }

  async function handleSave() {
    const next: MetricId[] = draftVisible
      ? hidden.filter((id) => id !== "profit")
      : [...new Set<MetricId>([...hidden, "profit"])]
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/dashboard-metrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenMetrics: next }),
      })
      const data = (await response.json()) as { hiddenMetrics?: MetricId[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? t("dashboardMetricsSaveError"))
      setHidden(data.hiddenMetrics ?? next)
      void reloadSession({ silent: true })
      setDialogOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("dashboardMetricsSaveError"))
    } finally {
      setSaving(false)
    }
  }

  const unchanged = draftVisible === poasVisible

  return (
    <>
      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6]/80 px-5 py-3.5">
          <span className={adminIconBoxClass("neutral")} aria-hidden="true">
            <LayoutDashboardIcon className="size-[18px]" />
          </span>
          <h2 className="text-base font-semibold text-foreground">{t("dashboardMetricsSectionTitle")}</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-foreground">{t("dashboardMetricsPoasLabel")}</p>
            {!loaded ? (
              <span className="text-sm text-muted-foreground">…</span>
            ) : loadError ? (
              <span className="text-sm text-danger-foreground">{t("dashboardMetricsLoadError")}</span>
            ) : (
              <StatusPill on={poasVisible} />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className={adminOutlineButtonClass}
            disabled={!loaded || loadError}
            onClick={openDialog}
          >
            <PencilIcon className="size-4" aria-hidden="true" />
            {t("dashboardMetricsEdit")}
          </Button>
        </div>
      </section>

      {dialogOpen ? (
        <ModalShell
          title={t("dashboardMetricsPoasLabel")}
          busy={saving}
          dismissible={!saving}
          onClose={closeDialog}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className={adminOutlineButtonClass}
                disabled={saving}
                onClick={closeDialog}
              >
                {t("dashboardMetricsCancel")}
              </Button>
              <Button type="button" disabled={saving || unchanged} onClick={() => void handleSave()}>
                {saving ? t("dashboardMetricsSaving") : t("dashboardMetricsSave")}
              </Button>
            </>
          }
        >
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e8e0d8] bg-white px-4 py-3.5">
            <p className="text-sm font-semibold text-foreground">{t("dashboardMetricsToggleLabel")}</p>
            <div className="flex items-center gap-3">
              <StatusPill on={draftVisible} />
              <MetricSwitch
                checked={draftVisible}
                disabled={saving}
                onChange={setDraftVisible}
                label={t("dashboardMetricsToggleLabel")}
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-danger-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </ModalShell>
      ) : null}
    </>
  )
}
