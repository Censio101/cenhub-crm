"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ImportHistory } from "@/components/admin/import/ImportHistory"
import { ImportMapStep } from "@/components/admin/import/ImportMapStep"
import { ImportRunStep, type RunState } from "@/components/admin/import/ImportRunStep"
import { ImportStepper, type ImportStep } from "@/components/admin/import/ImportStepper"
import {
  ImportTestStep,
  SKIP_REASON_KEYS,
  type TestState,
} from "@/components/admin/import/ImportTestStep"
import { ImportUploadStep } from "@/components/admin/import/ImportUploadStep"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import type { LeadImportRecord } from "@/lib/db/lead-imports-repository"
import {
  IMPORT_STANDARD_TARGETS,
  cleanMapping,
  suggestColumnMapping,
} from "@/lib/import/column-mapping"
import { markFileDuplicates } from "@/lib/import/dedupe"
import type { ParsedFile } from "@/lib/import/parse-file"
import {
  ImportRunError,
  importFingerprint,
  runImportBatches,
  skippedRowsCsv,
} from "@/lib/import/run-batches"
import { sheetTable } from "@/lib/import/sheet-table"
import type { ColumnMapping, ImportOptions } from "@/lib/import/types"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

const STEP_ORDER: ImportStep[] = ["upload", "map", "test", "import"]

const DEFAULT_OPTIONS: ImportOptions = {
  defaultStatus: "new_waiting_call",
  defaultPlatform: "",
  skipDuplicates: true,
}

const IDLE_TEST: TestState = { status: "idle", done: 0, total: 0, summary: null, error: null }

/** Import a client's old Excel / CSV sheet as leads: upload, map, test run, import. */
export function AdminClientImportPanel() {
  const { slug } = useAdminClient()
  const { t } = useLanguage()

  const [step, setStep] = useState<ImportStep>("upload")
  const [reached, setReached] = useState<ImportStep>("upload")
  const [file, setFile] = useState<ParsedFile | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [headerRow, setHeaderRow] = useState(1)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS)
  const [resolved, setResolved] = useState<ResolvedLeadSheetConfig | null>(null)
  const [history, setHistory] = useState<LeadImportRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [test, setTest] = useState<TestState>(IDLE_TEST)
  const [testFingerprint, setTestFingerprint] = useState<string | null>(null)
  const [run, setRun] = useState<RunState | null>(null)
  const [undoTarget, setUndoTarget] = useState<{ id: string; fileName: string } | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/imports`)
      if (!response.ok) throw new Error("history")
      const data = (await response.json()) as { imports: LeadImportRecord[] }
      setHistory(data.imports)
    } catch {
      // The history is a convenience; the import itself works without it.
    } finally {
      setHistoryLoading(false)
    }
  }, [slug])

  useAsyncEffect(
    async (signal) => {
      try {
        const response = await fetch(`/api/admin/organizations/${slug}/lead-sheet`)
        if (!response.ok) throw new Error("sheet")
        const data = (await response.json()) as { resolved: ResolvedLeadSheetConfig | null }
        if (!signal.cancelled) setResolved(data.resolved)
      } catch {
        if (!signal.cancelled) setError(t("funnelsLoadError"))
      }
    },
    [slug, t]
  )

  useAsyncEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const sheetColumns = useMemo(() => resolved?.columns ?? [], [resolved])
  const customTargets = useMemo(
    () =>
      sheetColumns.flatMap((column) =>
        column.kind === "custom"
          ? [
              {
                target: `customFields.${column.customField.fieldKey}`,
                label: column.customField.label,
                key: column.customField.fieldKey,
              },
            ]
          : []
      ),
    [sheetColumns]
  )

  const suggest = useCallback(
    (headers: string[]) =>
      suggestColumnMapping(headers, [
        ...IMPORT_STANDARD_TARGETS.map((target) => ({ target })),
        ...customTargets.map((c) => ({ target: c.target, names: [c.key, c.label] })),
      ]),
    [customTargets]
  )

  const sheet = file?.sheets[sheetIndex] ?? null
  const table = useMemo(
    () => (sheet ? sheetTable(sheet.matrix, headerRow) : { headers: [], rows: [] }),
    [sheet, headerRow]
  )
  const cleaned = useMemo(() => cleanMapping(mapping, table.headers), [mapping, table.headers])
  const rowsForRun = useMemo(() => markFileDuplicates(table.rows, cleaned), [table.rows, cleaned])
  const fingerprint = useMemo(
    () =>
      file && sheet
        ? importFingerprint({
            fileName: file.fileName,
            size: file.size,
            sheet: sheet.name,
            headerRow,
            rowCount: table.rows.length,
            mapping: cleaned,
            options,
          })
        : null,
    [file, sheet, headerRow, table.rows.length, cleaned, options]
  )
  const upToDate =
    test.status === "done" && testFingerprint !== null && testFingerprint === fingerprint

  function resetProgress() {
    abortRef.current?.abort()
    setTest(IDLE_TEST)
    setTestFingerprint(null)
    setRun(null)
  }

  function goTo(next: ImportStep) {
    setStep(next)
    setReached((current) =>
      STEP_ORDER.indexOf(next) > STEP_ORDER.indexOf(current) ? next : current
    )
  }

  function handleFile(parsed: ParsedFile) {
    resetProgress()
    setFile(parsed)
    setSheetIndex(0)
    setHeaderRow(1)
    setMapping(suggest(sheetTable(parsed.sheets[0].matrix, 1).headers))
    setReached("upload")
    setError(null)
  }

  function handleSheet(index: number) {
    if (!file) return
    resetProgress()
    setSheetIndex(index)
    setHeaderRow(1)
    setMapping(suggest(sheetTable(file.sheets[index].matrix, 1).headers))
  }

  function handleHeaderRow(row: number) {
    if (!sheet) return
    resetProgress()
    setHeaderRow(row)
    setMapping(suggest(sheetTable(sheet.matrix, row).headers))
  }

  async function startTest() {
    if (!file || !fingerprint) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const started = fingerprint
    goTo("test")
    setTest({ status: "running", done: 0, total: rowsForRun.length, summary: null, error: null })
    try {
      const summary = await runImportBatches({
        slug,
        rows: rowsForRun,
        mapping: cleaned,
        options,
        dryRun: true,
        signal: controller.signal,
        onProgress: (done, total) =>
          setTest((current) =>
            current.status === "running" ? { ...current, done, total } : current
          ),
      })
      setTest({
        status: "done",
        done: rowsForRun.length,
        total: rowsForRun.length,
        summary,
        error: null,
      })
      setTestFingerprint(started)
    } catch (e) {
      if (controller.signal.aborted) return
      setTest({
        status: "error",
        done: 0,
        total: 0,
        summary: null,
        error: e instanceof Error ? e.message : t("funnelsLoadError"),
      })
    }
  }

  async function startImport() {
    if (!file || !upToDate) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    goTo("import")
    setError(null)
    setRun({
      status: "running",
      done: 0,
      total: rowsForRun.length,
      error: null,
      summary: null,
      importId: null,
    })

    let importId: string | null = null
    let latest: RunState["summary"] = null
    try {
      const start = await fetch(`/api/admin/organizations/${slug}/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.fileName, totalRows: rowsForRun.length }),
      })
      const started = (await start.json().catch(() => ({}))) as {
        import?: LeadImportRecord
        error?: string
      }
      if (!start.ok || !started.import) throw new ImportRunError(started.error ?? "Import failed")
      importId = started.import.id
      setRun((current) => (current ? { ...current, importId } : current))

      const summary = await runImportBatches({
        slug,
        rows: rowsForRun,
        mapping: cleaned,
        options,
        dryRun: false,
        importId,
        signal: controller.signal,
        onProgress: (done, total) =>
          setRun((current) =>
            current?.status === "running" ? { ...current, done, total } : current
          ),
        onSummary: (partial) => {
          latest = partial
        },
      })
      const skipped =
        summary.skipped.no_contact +
        summary.skipped.duplicate_existing +
        summary.skipped.duplicate_file
      await fetch(`/api/admin/organizations/${slug}/imports/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skippedCount: skipped, warningCount: summary.withWarnings }),
      })
      setRun({
        status: "done",
        done: rowsForRun.length,
        total: rowsForRun.length,
        error: null,
        summary,
        importId,
      })
    } catch (e) {
      if (importId) {
        // Close the batch with what was saved, so it shows up in the history and can be undone.
        await fetch(`/api/admin/organizations/${slug}/imports/${importId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skippedCount: 0, warningCount: 0 }),
        }).catch(() => undefined)
      }
      setRun((current) => ({
        status: "error",
        done: current?.done ?? 0,
        total: current?.total ?? 0,
        error: e instanceof Error ? e.message : t("funnelsLoadError"),
        summary: latest,
        importId,
      }))
    } finally {
      void loadHistory()
    }
  }

  async function confirmUndo() {
    if (!undoTarget) return
    setUndoing(true)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/imports/${undoTarget.id}`, {
        method: "DELETE",
      })
      const data = (await response.json().catch(() => ({}))) as { removed?: number; error?: string }
      if (!response.ok) throw new Error(data.error ?? t("funnelsLoadError"))
      setNotice(t("importUndone").replace("{count}", String(data.removed ?? 0)))
      setRun((current) =>
        current?.importId === undoTarget.id ? { ...current, status: "undone" } : current
      )
      await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("funnelsLoadError"))
    } finally {
      setUndoing(false)
      setUndoTarget(null)
    }
  }

  function startAnother() {
    resetProgress()
    setFile(null)
    setMapping({})
    setOptions(DEFAULT_OPTIONS)
    setStep("upload")
    setReached("upload")
  }

  function downloadSkipped() {
    if (!test.summary || !file) return
    const csv = skippedRowsCsv(table.headers, rowsForRun, test.summary.skippedRows, (reason) =>
      t(SKIP_REASON_KEYS[reason])
    )
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `skipped-rows-${file.fileName.replace(/\.[^.]+$/, "")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const busy = run?.status === "running"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("importTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("importIntro")}</p>
      </div>

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

      <ImportStepper step={step} reached={reached} disabled={busy} onGo={goTo} />

      <div className="rounded-2xl border border-[#d3c3b2] bg-card p-4 shadow-[0_1px_3px_rgba(26,18,8,0.06)] sm:p-6">
        {step === "upload" ? (
          <ImportUploadStep
            file={file}
            sheetIndex={sheetIndex}
            headerRow={headerRow}
            rowCount={table.rows.length}
            headerCount={table.headers.length}
            onFile={handleFile}
            onSheet={handleSheet}
            onHeaderRow={handleHeaderRow}
            onContinue={() => goTo("map")}
          />
        ) : step === "map" ? (
          <ImportMapStep
            slug={slug}
            headers={table.headers}
            rows={rowsForRun}
            mapping={cleaned}
            onMapping={setMapping}
            onAutoMatch={() => setMapping({ ...suggest(table.headers), ...cleaned })}
            options={options}
            onOptions={setOptions}
            customTargets={customTargets}
            sheetColumns={sheetColumns}
            onBack={() => goTo("upload")}
            onContinue={() => void startTest()}
          />
        ) : step === "test" ? (
          <ImportTestStep
            test={test}
            upToDate={upToDate}
            columns={sheetColumns}
            onRun={() => void startTest()}
            onBack={() => goTo("map")}
            onImport={() => void startImport()}
            onDownloadSkipped={downloadSkipped}
          />
        ) : run ? (
          <ImportRunStep
            run={run}
            onUndo={() =>
              run.importId && setUndoTarget({ id: run.importId, fileName: file?.fileName ?? "" })
            }
            onAnother={startAnother}
          />
        ) : null}
      </div>

      <ImportHistory
        imports={history}
        loading={historyLoading}
        onUndo={(record) => setUndoTarget({ id: record.id, fileName: record.fileName })}
      />

      {undoTarget ? (
        <ConfirmDialog
          destructive
          title={t("importUndoTitle").replace("{name}", undoTarget.fileName || t("importUntitled"))}
          message={t("importUndoBody")}
          confirmLabel={t("importUndo")}
          busy={undoing}
          onConfirm={() => void confirmUndo()}
          onClose={() => setUndoTarget(null)}
        />
      ) : null}
    </div>
  )
}
