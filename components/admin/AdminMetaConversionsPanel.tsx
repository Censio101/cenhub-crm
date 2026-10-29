"use client"

import { SendIcon } from "lucide-react"
import { useCallback, useState } from "react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminOutlineButtonClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import type { CapiOverview } from "@/lib/meta/capi-outbox"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

type State = {
  enabled: boolean
  pixelId: string
} & CapiOverview

const STATUS_LABEL: Record<string, MessageKey> = {
  pending: "metaCapiStatusPending",
  sent: "metaCapiStatusSent",
  failed: "metaCapiStatusFailed",
  skipped: "metaCapiStatusSkipped",
  expired: "metaCapiStatusExpired",
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  sent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  skipped: "bg-[#f4f0ea] text-muted-foreground border-[#e0d7cc]",
  expired: "bg-[#f4f0ea] text-muted-foreground border-[#e0d7cc]",
}

const SKIP_LABEL: Record<string, MessageKey> = {
  not_from_meta: "metaCapiSkipNotFromMeta",
  no_pixel: "metaCapiSkipNoPixel",
  switched_off: "metaCapiSkipSwitchedOff",
}

function Switch({
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

/**
 * "Send won leads to Meta" for one client: switch, test event and the latest events.
 * `pixelId` is the pixel currently chosen in the form above (the switch needs a saved pixel).
 */
export function AdminMetaConversionsPanel({
  slug,
  pixelId,
}: {
  slug: string
  pixelId: string
}) {
  const { t, locale } = useLanguage()
  const [state, setState] = useState<State | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [testCode, setTestCode] = useState("")
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useAsyncEffect(
    async (signal) => {
      try {
        const response = await fetch(`/api/admin/organizations/${slug}/meta/conversions`, {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("load failed")
        const data = (await response.json()) as State
        if (signal.cancelled) return
        setState(data)
        setLoadError(false)
      } catch {
        if (!signal.cancelled) setLoadError(true)
      }
    },
    [slug, pixelId, reloadKey]
  )

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  async function toggle(next: boolean) {
    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/conversions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setNotice({
          ok: false,
          text:
            data.error === "pixel_required"
              ? t("metaCapiNeedsPixel")
              : t("metaCapiSaveFailed"),
        })
        return
      }
      reload()
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/conversions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEventCode: testCode }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      setNotice({
        ok: Boolean(response.ok && data.ok),
        text: data.message ?? t("metaCapiTestFailed"),
      })
    } finally {
      setTesting(false)
    }
  }

  const savedPixel = state?.pixelId ?? ""
  const canEnable = Boolean(savedPixel)

  function formatTime(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(locale === "da" ? "da-DK" : "en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
  }

  return (
    <div className="mt-6 grid gap-4 border-t border-[#e8e0d8] pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={adminIconBoxClass("brand")} aria-hidden="true">
            <SendIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-foreground">{t("metaCapiTitle")}</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {t("metaCapiLead")}
            </p>
          </div>
        </div>
        <Switch
          checked={Boolean(state?.enabled)}
          disabled={!state || saving || (!state.enabled && !canEnable)}
          onChange={(next) => void toggle(next)}
          label={t("metaCapiTitle")}
        />
      </div>

      {!canEnable && state ? (
        <p className="text-[13px] text-muted-foreground">{t("metaCapiNeedsPixel")}</p>
      ) : null}

      {loadError ? (
        <p className="text-[13px] text-red-700" role="alert">
          {t("metaCapiLoadFailed")}
        </p>
      ) : null}

      {state ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(["sent", "pending", "failed", "skipped", "expired"] as const).map((status) => (
              <span
                key={status}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                  STATUS_TONE[status]
                )}
              >
                {t(STATUS_LABEL[status])}
                <span className="tabular-nums">{state.counts[status]}</span>
              </span>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className={adminFieldClass}
              value={testCode}
              placeholder={t("metaCapiTestCodePlaceholder")}
              onChange={(event) => setTestCode(event.target.value)}
              aria-label={t("metaCapiTestCodePlaceholder")}
            />
            <Button
              type="button"
              variant="outline"
              className={adminOutlineButtonClass}
              disabled={testing || !testCode.trim() || !canEnable}
              onClick={() => void sendTest()}
            >
              {testing ? t("metaCapiTesting") : t("metaCapiTestButton")}
            </Button>
          </div>
          <p className="-mt-2 text-[12px] text-muted-foreground">{t("metaCapiTestHint")}</p>

          {notice ? (
            <p
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-[13px]",
                notice.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              )}
              role="status"
            >
              {notice.text}
            </p>
          ) : null}

          {state.recent.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[#e8e0d8]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#faf8f6] text-[11px] font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("metaCapiColLead")}</th>
                    <th className="px-3 py-2">{t("metaCapiColStatus")}</th>
                    <th className="px-3 py-2 text-right">{t("metaCapiColValue")}</th>
                    <th className="px-3 py-2">{t("metaCapiColTime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.recent.map((event) => (
                    <tr key={event.id} className="border-t border-[#eee7de] align-top">
                      <td className="px-3 py-2">{event.lead_name || "–"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            STATUS_TONE[event.status]
                          )}
                        >
                          {t(STATUS_LABEL[event.status])}
                        </span>
                        {event.skip_reason ? (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {SKIP_LABEL[event.skip_reason]
                              ? t(SKIP_LABEL[event.skip_reason])
                              : event.skip_reason}
                          </p>
                        ) : null}
                        {event.last_error && event.status !== "sent" ? (
                          <p className="mt-0.5 text-[12px] text-red-700">{event.last_error}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {event.value != null
                          ? `${Math.round(event.value).toLocaleString("da-DK")} ${event.currency}`
                          : "–"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatTime(event.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">{t("metaCapiNoEvents")}</p>
          )}
        </>
      ) : null}
    </div>
  )
}
