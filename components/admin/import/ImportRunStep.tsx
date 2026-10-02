"use client"

import { AlertTriangleIcon, CheckCircle2Icon, Undo2Icon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ImportRunSummary } from "@/lib/import/run-batches"
import { cn } from "cn"

export type RunState = {
  status: "running" | "done" | "error" | "undone"
  done: number
  total: number
  error: string | null
  summary: ImportRunSummary | null
  importId: string | null
}

type Props = {
  run: RunState
  onUndo: () => void
  onAnother: () => void
}

/** Step 4: the import while it runs, then the report. */
export function ImportRunStep({ run, onUndo, onAnother }: Props) {
  const { t } = useLanguage()
  const progress = run.total > 0 ? Math.round((run.done / run.total) * 100) : 0
  const summary = run.summary
  const skipped = summary
    ? summary.skipped.no_contact +
      summary.skipped.duplicate_existing +
      summary.skipped.duplicate_file
    : 0

  if (run.status === "running") {
    return (
      <div className={cn(adminSectionCardClass, "space-y-4 p-6")} aria-busy="true">
        <p className="text-base font-semibold">{t("importImporting")}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#f3ebe3]">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {run.done.toLocaleString("da-DK")} / {run.total.toLocaleString("da-DK")}
        </p>
        <p className="text-xs text-muted-foreground">{t("importKeepOpen")}</p>
      </div>
    )
  }

  if (run.status === "error") {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
        <p className="flex items-center gap-2 text-base font-semibold text-red-950">
          <AlertTriangleIcon className="size-5" aria-hidden />
          {t("importStopped")}
        </p>
        <p className="text-sm text-red-900">{run.error}</p>
        <p className="text-sm text-red-900">
          {t("importPartial").replace("{count}", (summary?.inserted ?? 0).toLocaleString("da-DK"))}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onUndo}>
            <Undo2Icon className="size-4" aria-hidden />
            {t("importUndo")}
          </Button>
          <Button type="button" variant="ghost" onClick={onAnother}>
            {t("importAnother")}
          </Button>
        </div>
      </div>
    )
  }

  if (run.status === "undone") {
    return (
      <div className={cn(adminSectionCardClass, "space-y-4 p-6")}>
        <p className="text-base font-semibold">{t("importWasUndone")}</p>
        <Button type="button" onClick={onAnother}>
          {t("importAnother")}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(adminSectionCardClass, "space-y-5 p-6")}>
      <div className="flex items-start gap-3">
        <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="text-lg font-semibold">
            {t("importDone").replace("{count}", (summary?.inserted ?? 0).toLocaleString("da-DK"))}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("importDoneDetail")
              .replace("{skipped}", skipped.toLocaleString("da-DK"))
              .replace("{warnings}", (summary?.withWarnings ?? 0).toLocaleString("da-DK"))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onAnother}>
          {t("importAnother")}
        </Button>
        <Button type="button" variant="outline" onClick={onUndo}>
          <Undo2Icon className="size-4" aria-hidden />
          {t("importUndo")}
        </Button>
      </div>
    </div>
  )
}
