"use client"

import { useEffect, useState } from "react"
import { CheckCircle2Icon, Loader2Icon, RadioIcon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { FunnelSampleState } from "@/hooks/useFunnelSample"
import { cn } from "cn"

type Props = {
  state: FunnelSampleState
  enabled: boolean
  /** How many values were found in the sample. */
  fieldCount: number
  truncated: boolean
  actionError: boolean
  onListen: () => void
  onStop: () => void
  onClear: () => void
}

/** Seconds left until `endsAt`, counted down once a second. */
function useSecondsLeft(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endsAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])
  return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000))
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/** Step 2 for a sender with its own names: wait for one request and keep it as the sample. */
export function FunnelSampleStep({
  state,
  enabled,
  fieldCount,
  truncated,
  actionError,
  onListen,
  onStop,
  onClear,
}: Props) {
  const { t } = useLanguage()
  const left = useSecondsLeft(state.listeningEndsAt)
  const listening = state.listeningEndsAt !== null && (left ?? 0) > 0
  const busy = state.busy

  return (
    <div className="space-y-3 text-sm" aria-live="polite">
      {listening ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative flex size-3 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
            </span>
            <p className="min-w-0 flex-1 font-semibold text-amber-950">
              {t("funnelSampleWaiting")}
              <span className="ml-2 font-mono text-xs tabular-nums text-amber-800">
                {formatClock(left ?? 0)}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-400 bg-white"
              disabled={busy}
              onClick={onStop}
            >
              {t("funnelSampleCancel")}
            </Button>
          </div>
        </div>
      ) : state.sample ? (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-950">
                {t("funnelSampleReceived").replace(
                  "{time}",
                  state.receivedAt ? new Date(state.receivedAt).toLocaleString() : ""
                )}
              </p>
              <p className="text-xs text-emerald-900">
                {t("funnelSampleFields").replace("{count}", String(fieldCount))}
                {truncated ? ` · ${t("funnelSampleTruncated")}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={adminOutlineButtonClass}
                disabled={busy || !enabled}
                onClick={onListen}
              >
                {t("funnelSampleAgain")}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClear}>
                {t("funnelSampleClear")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#d3c3b2] bg-[#faf8f6] p-3.5">
          <Button type="button" disabled={busy || !enabled || !state.loaded} onClick={onListen}>
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RadioIcon className="size-4" aria-hidden />
            )}
            {t("funnelSampleListen")}
          </Button>
        </div>
      )}

      {state.error ? (
        <p
          role="alert"
          className={cn(
            "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          )}
        >
          {t("funnelSampleError").replace("{error}", state.error)}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-xs text-red-700">
          {t("funnelsLoadError")}
        </p>
      ) : null}
    </div>
  )
}
