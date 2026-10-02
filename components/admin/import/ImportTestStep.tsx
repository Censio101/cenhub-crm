"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, CheckCircle2Icon, DownloadIcon, XCircleIcon } from "lucide-react"

import { AdminPillTabs } from "@/components/admin/AdminPillTabs"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { ImportLeadsTable } from "@/components/admin/import/ImportLeadsTable"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ImportRunSummary } from "@/lib/import/run-batches"
import type { ImportSkipReason } from "@/lib/import/types"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { cn } from "cn"

export type TestState = {
  status: "idle" | "running" | "done" | "error"
  done: number
  total: number
  summary: ImportRunSummary | null
  error: string | null
}

type Filter = "all" | "warnings" | "skipped"

type Props = {
  test: TestState
  /** The finished test matches the current file, mapping and options. */
  upToDate: boolean
  columns: LeadSheetTemplateColumn[]
  onRun: () => void
  onBack: () => void
  onImport: () => void
  onDownloadSkipped: () => void
}

export const SKIP_REASON_KEYS: Record<
  ImportSkipReason,
  "importSkipNoContact" | "importSkipDuplicateExisting" | "importSkipDuplicateFile"
> = {
  no_contact: "importSkipNoContact",
  duplicate_existing: "importSkipDuplicateExisting",
  duplicate_file: "importSkipDuplicateFile",
}

const PAGE = 50

function Stat({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone?: "ok" | "warn" | "muted"
}) {
  return (
    <div className={cn(adminSectionCardClass, "px-4 py-3")}>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "ok" && "text-emerald-700",
          tone === "warn" && "text-amber-700"
        )}
      >
        {value.toLocaleString("da-DK")}
      </p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

/** Step 3: a full test run that saves nothing, and what it found. */
export function ImportTestStep({
  test,
  upToDate,
  columns,
  onRun,
  onBack,
  onImport,
  onDownloadSkipped,
}: Props) {
  const { t } = useLanguage()
  const [filter, setFilter] = useState<Filter>("all")
  const [shown, setShown] = useState(PAGE)
  const summary = test.summary

  const issues = useMemo(() => {
    if (!summary) return []
    return summary.issues.filter((issue) =>
      filter === "all"
        ? true
        : filter === "warnings"
          ? issue.kind === "warning"
          : issue.kind === "skipped"
    )
  }, [summary, filter])

  const skippedTotal = summary
    ? summary.skipped.no_contact +
      summary.skipped.duplicate_existing +
      summary.skipped.duplicate_file
    : 0
  const canImport = test.status === "done" && upToDate && (summary?.toImport ?? 0) > 0
  const progress = test.total > 0 ? Math.round((test.done / test.total) * 100) : 0

  return (
    <div className="space-y-6">
      {test.status === "running" ? (
        <div className="space-y-4" aria-busy="true">
          <div className={cn(adminSectionCardClass, "space-y-3 p-4")}>
            <p className="text-sm font-semibold">
              {t("importTesting")}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                {test.done.toLocaleString("da-DK")} / {test.total.toLocaleString("da-DK")}
              </span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[#f3ebe3]">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="skeleton-shimmer h-20 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton-shimmer h-48 w-full rounded-2xl" />
        </div>
      ) : test.status === "error" ? (
        <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
            <XCircleIcon className="size-5" aria-hidden />
            {t("importTestFailed")}
          </p>
          <p className="text-sm text-red-800">{test.error}</p>
          <Button type="button" variant="outline" onClick={onRun}>
            {t("importRunTestAgain")}
          </Button>
        </div>
      ) : test.status === "idle" || !summary ? (
        <div
          className={cn(adminSectionCardClass, "flex flex-col items-center gap-3 p-8 text-center")}
        >
          <p className="text-sm text-muted-foreground">{t("importTestIntro")}</p>
          <Button type="button" onClick={onRun}>
            {t("importRunTest")}
          </Button>
        </div>
      ) : (
        <>
          {!upToDate ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-950">
                <AlertTriangleIcon className="size-4 text-amber-700" aria-hidden />
                {t("importTestStale")}
              </p>
              <Button type="button" size="sm" onClick={onRun}>
                {t("importRunTestAgain")}
              </Button>
            </div>
          ) : summary.toImport > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  {t("importReady").replace("{count}", summary.toImport.toLocaleString("da-DK"))}
                </p>
                <p className="text-xs text-emerald-900">{t("importReadyHint")}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <XCircleIcon className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-red-950">{t("importNothing")}</p>
                <p className="text-xs text-red-900">{t("importNothingHint")}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat value={summary.toImport} label={t("importStatWillImport")} tone="ok" />
            <Stat value={summary.withWarnings} label={t("importStatWarnings")} tone="warn" />
            <Stat
              value={summary.skipped.duplicate_existing}
              label={t("importSkipDuplicateExisting")}
            />
            <Stat value={summary.skipped.duplicate_file} label={t("importSkipDuplicateFile")} />
            <Stat value={summary.skipped.no_contact} label={t("importSkipNoContact")} />
          </div>

          {summary.previews.length > 0 ? (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">{t("importLooksLike")}</h4>
              <ImportLeadsTable columns={columns} rows={summary.previews} />
              {summary.previews.some((row) => row.changes.length > 0) ? (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    {t("importChangesTitle")}
                  </summary>
                  <div className={cn(adminSectionCardClass, "mt-2 overflow-x-auto")}>
                    <table className="w-full min-w-max border-collapse text-xs">
                      <thead className="bg-[#faf8f6] text-left text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">{t("importRowLabel")}</th>
                          <th className="px-3 py-2 font-medium">{t("importChangeField")}</th>
                          <th className="px-3 py-2 font-medium">{t("importChangeFrom")}</th>
                          <th className="px-3 py-2 font-medium">{t("importChangeTo")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efe8e0]">
                        {summary.previews.flatMap((row) =>
                          row.changes.map((change, index) => (
                            <tr key={`${row.rowNumber}-${index}`}>
                              <td className="px-3 py-1.5 tabular-nums">{row.rowNumber}</td>
                              <td className="px-3 py-1.5 font-mono">{change.field}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{change.from}</td>
                              <td className="px-3 py-1.5 font-medium">{change.to}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}

          {summary.issues.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{t("importIssues")}</h4>
                <AdminPillTabs
                  value={filter}
                  onChange={(next) => {
                    setFilter(next)
                    setShown(PAGE)
                  }}
                  options={[
                    { id: "all", label: t("importFilterAll") },
                    { id: "warnings", label: t("importFilterWarnings") },
                    { id: "skipped", label: t("importFilterSkipped") },
                  ]}
                />
              </div>
              <ul
                className={cn(adminSectionCardClass, "divide-y divide-[#efe8e0] overflow-hidden")}
              >
                {issues.slice(0, shown).map((issue) => (
                  <li
                    key={`${issue.rowNumber}-${issue.kind}`}
                    className="flex gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {t("importRowShort").replace("{row}", String(issue.rowNumber))}
                    </span>
                    <span className="min-w-0 flex-1">
                      {issue.kind === "skipped" && issue.reason ? (
                        <span className="text-red-800">{t(SKIP_REASON_KEYS[issue.reason])}</span>
                      ) : (
                        <span className="text-amber-900">{issue.messages.join(" · ")}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {issues.length > shown ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShown((n) => n + PAGE)}
                >
                  {t("importShowMore").replace("{count}", String(issues.length - shown))}
                </Button>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe7de] pt-4">
        <Button type="button" variant="ghost" disabled={test.status === "running"} onClick={onBack}>
          {t("importBackToMapping")}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {summary && skippedTotal > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={onDownloadSkipped}>
              <DownloadIcon className="size-4" aria-hidden />
              {t("importDownloadSkipped")}
            </Button>
          ) : null}
          <Button type="button" disabled={!canImport} onClick={onImport}>
            {canImport
              ? t("importStartImport").replace(
                  "{count}",
                  (summary?.toImport ?? 0).toLocaleString("da-DK")
                )
              : t("importStepImport")}
          </Button>
        </div>
      </div>
    </div>
  )
}
