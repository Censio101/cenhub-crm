"use client"

import { useMemo, useState } from "react"
import { Loader2Icon, PlayIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Mapping = Record<string, string>

type TestResult =
  | { ok: false; error: string }
  | {
      ok: true
      lead: Record<string, unknown>
      customFields: Record<string, unknown>
      warnings: { field: string; message: string }[]
    }

type Props = {
  slug: string
  funnelId: string
  /** The body to run, or null when there is none yet. */
  payload: Record<string, unknown> | null
  /** The mapping to apply (an unsaved draft is fine). */
  mapping: Mapping
  /** Offer a box to paste a different JSON body. */
  allowPaste?: boolean
  /** The body is still being loaded: show the skeleton instead of "no sample". */
  loading?: boolean
  /** `split`: request and response side by side (Test tab). `stacked`: one column (preview). */
  layout?: "stacked" | "split"
}

/** Same footprint as a typical result, so the tab does not jump when it arrives. */
function TestSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-[#e8e0d8] bg-[#faf8f6] p-3" aria-busy="true">
      <div className="skeleton-shimmer h-4 w-40 rounded-md" />
      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="contents">
            <div className="skeleton-shimmer h-3.5 w-24 rounded" />
            <div className="skeleton-shimmer h-3.5 w-full max-w-xs rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const codeBlockClass =
  "overflow-auto rounded-lg border border-[#e8e0d8] bg-[#faf8f5] p-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground"

/**
 * Dry run through the same pipeline as the real webhook (nothing is saved). Runs only when the
 * admin presses the button — the exact JSON that will be sent is shown next to the result.
 */
export function FunnelTestPanel({
  slug,
  funnelId,
  payload,
  mapping,
  allowPaste,
  loading = false,
  layout = "stacked",
}: Props) {
  const { t } = useLanguage()
  const [pasted, setPasted] = useState("")
  const [result, setResult] = useState<TestResult | null>(null)
  const [running, setRunning] = useState(false)
  /** The payload+mapping the shown result belongs to, so edits can be flagged as stale. */
  const [ranKey, setRanKey] = useState<string | null>(null)

  const pastedPayload = useMemo(() => {
    if (!pasted.trim()) return null
    try {
      const parsed = JSON.parse(pasted) as unknown
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : "invalid"
    } catch {
      return "invalid"
    }
  }, [pasted])

  const effective = pastedPayload && pastedPayload !== "invalid" ? pastedPayload : payload
  const currentKey = `${JSON.stringify(mapping)}:${JSON.stringify(effective)}`
  const stale = result !== null && ranKey !== null && ranKey !== currentKey

  async function run() {
    if (!effective || running) return
    setRunning(true)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/funnels/${funnelId}/test-payload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: effective, fieldMapping: mapping }),
        }
      )
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        lead?: Record<string, unknown>
        customFields?: Record<string, unknown>
        warnings?: { field: string; message: string }[]
      }
      setResult(
        data.ok && data.lead
          ? {
              ok: true,
              lead: data.lead,
              customFields: data.customFields ?? {},
              warnings: data.warnings ?? [],
            }
          : { ok: false, error: data.error ?? t("funnelsLoadError") }
      )
      setRanKey(currentKey)
    } catch {
      setResult({ ok: false, error: t("funnelsLoadError") })
      setRanKey(currentKey)
    } finally {
      setRunning(false)
    }
  }

  const runButton = (
    <Button type="button" size="sm" disabled={!effective || running} onClick={() => void run()}>
      {running ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <PlayIcon className="size-4" aria-hidden />
      )}
      {result ? t("funnelTestRunAgain") : t("funnelTestRun")}
    </Button>
  )

  const pasteBox = allowPaste ? (
    <details className="text-xs">
      <summary className="cursor-pointer font-medium text-foreground select-none">
        {t("funnelTestOther")}
      </summary>
      <textarea
        className="mt-2 min-h-32 w-full rounded-lg border border-[#d3c3b2] bg-[#faf8f5] p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        value={pasted}
        spellCheck={false}
        aria-label={t("funnelTestOther")}
        onChange={(e) => setPasted(e.target.value)}
      />
      {pastedPayload === "invalid" ? (
        <p role="alert" className="mt-1 text-red-700">
          {t("funnelTestInvalidJson")}
        </p>
      ) : null}
    </details>
  ) : null

  const resultView = result ? (
    result.ok ? (
      <div
        role="status"
        className={cn(
          "space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950",
          running && "opacity-60"
        )}
      >
        <p className="text-sm font-semibold">{t("funnelTestOk")}</p>
        <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
          {Object.entries(result.lead)
            .filter(([, value]) => value !== "" && value !== null)
            .filter(([, value]) => !(Array.isArray(value) && value.length === 0))
            .map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="font-mono text-emerald-800">{key}</dt>
                <dd className="min-w-0 break-words">{displayValue(value)}</dd>
              </div>
            ))}
          {Object.entries(result.customFields).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-emerald-800">customFields.{key}</dt>
              <dd className="min-w-0 break-words">{displayValue(value)}</dd>
            </div>
          ))}
        </dl>
        {result.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-950">
            <p className="font-semibold">{t("funnelTestWarnings")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {result.warnings.map((warning, index) => (
                <li key={`${warning.field}-${index}`}>
                  <span className="font-mono">{warning.field}</span>: {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    ) : (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        {t("funnelTestRejected").replace("{error}", result.error)}
      </p>
    )
  ) : null

  if (loading) {
    return (
      <div className="text-sm">
        <TestSkeleton />
      </div>
    )
  }

  if (!effective) {
    return (
      <div className="text-sm">
        <p className="rounded-lg border border-dashed border-[#d3c3b2] bg-[#faf8f6] px-3 py-3 text-xs text-muted-foreground">
          {t("funnelTestNoSample")}
        </p>
      </div>
    )
  }

  if (layout === "split") {
    return (
      <div className="grid gap-4 text-sm lg:grid-cols-2">
        <section className="rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{t("funnelRequestTitle")}</p>
          <pre className={cn(codeBlockClass, "mt-3 max-h-96")}>
            {JSON.stringify(effective, null, 2)}
          </pre>
          {pasteBox ? <div className="mt-3">{pasteBox}</div> : null}
        </section>

        <section className="flex flex-col rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("funnelResponseTitle")}</p>
            {runButton}
          </div>
          {stale && !running ? (
            <p className="mt-2 text-xs text-amber-800">{t("funnelTestStale")}</p>
          ) : null}
          <div className="mt-3 flex-1">
            {resultView ?? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d3c3b2] bg-[#faf8f6] text-muted-foreground">
                <PlayIcon className="size-5" aria-hidden />
                <p className="text-xs">{t("funnelResponseEmpty")}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <details className="rounded-lg border border-[#e8e0d8] bg-[#faf8f5] text-xs">
        <summary className="cursor-pointer px-3 py-2 font-medium text-foreground select-none">
          {t("funnelTestRequestBody")}
        </summary>
        <pre className="max-h-56 overflow-auto border-t border-[#e8e0d8] p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(effective, null, 2)}
        </pre>
      </details>

      {pasteBox}

      <div className="flex flex-wrap items-center gap-2.5">
        {runButton}
        {stale && !running ? (
          <span className="text-xs text-amber-800">{t("funnelTestStale")}</span>
        ) : null}
      </div>

      {resultView}
    </div>
  )
}
