"use client"

import {
  CheckIcon,
  ChevronDownIcon,
  FlaskConicalIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

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
        checked ? "bg-emerald-600" : "bg-[#d3c3b2]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

/**
 * "Send won leads to Meta" for one client: switch, test event and the latest events.
 * `pixelId` is the pixel currently chosen in the form above (the switch needs a saved pixel).
 */
export function AdminMetaConversionsPanel({ slug, pixelId }: { slug: string; pixelId: string }) {
  const { t, locale } = useLanguage()
  const [state, setState] = useState<State | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [testCode, setTestCode] = useState("")
  const [testing, setTesting] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  // A short message at the bottom of the card after the switch is changed.
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only the newest switch change may update the screen if the user clicks several times.
  const toggleRequest = useRef(0)

  const showToast = useCallback((next: { ok: boolean; text: string }) => {
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

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
    [slug, pixelId],
  )

  /** The switch moves at once; the server confirms in the background and the move is undone on failure. */
  async function toggle(next: boolean) {
    const request = ++toggleRequest.current
    const previous = Boolean(state?.enabled)
    setNotice(null)
    setState((current) => (current ? { ...current, enabled: next } : current))

    const undo = (text: string) => {
      if (request !== toggleRequest.current) return
      setState((current) => (current ? { ...current, enabled: previous } : current))
      showToast({ ok: false, text })
    }

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/meta/conversions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        undo(data.error === "pixel_required" ? t("metaCapiNeedsPixel") : t("metaCapiSaveFailed"))
        return
      }
      if (request === toggleRequest.current) {
        showToast({ ok: true, text: next ? t("metaCapiSwitchedOn") : t("metaCapiSwitchedOff") })
      }
    } catch {
      undo(t("metaCapiSaveFailed"))
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
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
      }
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

  const enabled = Boolean(state?.enabled)
  const visibleStatuses = (["sent", "pending", "failed", "skipped", "expired"] as const).filter(
    (status) =>
      status === "sent" ||
      status === "pending" ||
      status === "failed" ||
      (state?.counts[status] ?? 0) > 0,
  )

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#e0d7cc] bg-[#faf8f6]">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={adminIconBoxClass("brand")} aria-hidden="true">
            <SendIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold leading-tight text-foreground">
              {t("metaCapiTitle")}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{t("metaCapiLead")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {state ? (
            <span
              className={cn(
                "text-[12px] font-semibold",
                enabled ? "text-emerald-700" : "text-muted-foreground",
              )}
            >
              {enabled ? t("metaCapiOn") : t("metaCapiOff")}
            </span>
          ) : null}
          <Switch
            checked={enabled}
            disabled={!state || (!state.enabled && !canEnable)}
            onChange={(next) => void toggle(next)}
            label={t("metaCapiTitle")}
          />
        </div>
      </div>

      {!canEnable && state ? (
        <p className="border-t border-[#e8e0d8] px-4 py-2.5 text-[13px] text-amber-800">
          {t("metaCapiNeedsPixel")}
        </p>
      ) : null}

      {loadError ? (
        <p className="border-t border-[#e8e0d8] px-4 py-2.5 text-[13px] text-red-700" role="alert">
          {t("metaCapiLoadFailed")}
        </p>
      ) : null}

      {state ? (
        <div className="grid gap-3 border-t border-[#e8e0d8] bg-white px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap gap-2">
              {visibleStatuses.map((status) => (
                <span
                  key={status}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                    state.counts[status] === 0
                      ? "border-[#e8e0d8] bg-white text-muted-foreground"
                      : STATUS_TONE[status],
                  )}
                >
                  {t(STATUS_LABEL[status])}
                  <span className="tabular-nums">{state.counts[status]}</span>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTestOpen((open) => !open)}
              aria-expanded={testOpen}
              disabled={!canEnable}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FlaskConicalIcon className="size-3.5" aria-hidden="true" />
              {t("metaCapiTestOpen")}
              <ChevronDownIcon
                className={cn("size-3.5 transition-transform", testOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          </div>

          {testOpen ? (
            <div className="grid gap-1.5 rounded-xl border border-[#e8e0d8] bg-[#faf8f6] p-3">
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
                  className={cn(adminOutlineButtonClass, "h-11 rounded-xl px-4")}
                  disabled={testing || !testCode.trim() || !canEnable}
                  onClick={() => void sendTest()}
                >
                  {testing ? t("metaCapiTesting") : t("metaCapiTestButton")}
                </Button>
              </div>
              <p className="text-[12px] text-muted-foreground">{t("metaCapiTestHint")}</p>
            </div>
          ) : null}

          {notice ? (
            <p
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-[13px]",
                notice.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800",
              )}
              role="status"
            >
              {notice.text}
            </p>
          ) : null}

          {state.recent.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("metaCapiRecent")}
              </p>
              <ul className="divide-y divide-[#eee7de] overflow-hidden rounded-xl border border-[#e8e0d8]">
                {state.recent.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <span
                      className={cn(
                        "inline-flex w-[84px] shrink-0 justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                        event.event_name === "Qualified"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-orange-50 text-orange-700",
                      )}
                    >
                      {event.event_name === "Qualified"
                        ? t("metaCapiEventQualified")
                        : t("metaCapiEventWon")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {event.lead_name || "–"}
                      {event.skip_reason || (event.last_error && event.status !== "sent") ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {event.skip_reason
                            ? SKIP_LABEL[event.skip_reason]
                              ? t(SKIP_LABEL[event.skip_reason])
                              : event.skip_reason
                            : event.last_error}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground">
                      {event.value != null
                        ? `${Math.round(event.value).toLocaleString("da-DK")} ${event.currency}`
                        : "–"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_TONE[event.status],
                      )}
                    >
                      {t(STATUS_LABEL[event.status])}
                    </span>
                    <span className="hidden shrink-0 whitespace-nowrap text-muted-foreground sm:inline">
                      {formatTime(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">{t("metaCapiNoEvents")}</p>
          )}
        </div>
      ) : null}

      <div aria-live="polite" className="px-4">
        {toast ? (
          <p
            className={cn(
              "my-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium animate-in fade-in slide-in-from-bottom-1",
              toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800",
            )}
          >
            {toast.ok ? (
              <CheckIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
            )}
            {toast.text}
          </p>
        ) : null}
      </div>
    </section>
  )
}
