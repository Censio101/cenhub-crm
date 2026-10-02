"use client"

import { useRef, useState } from "react"
import { FileSpreadsheetIcon, Loader2Icon, UploadIcon } from "lucide-react"

import {
  adminFieldClass,
  adminSectionCardClass,
  adminSelectTriggerClass,
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
import { ImportFileError, parseImportFile, type ParsedFile } from "@/lib/import/parse-file"
import { MAX_IMPORT_ROWS } from "@/lib/import/types"
import { cn } from "cn"

type Props = {
  file: ParsedFile | null
  sheetIndex: number
  headerRow: number
  rowCount: number
  headerCount: number
  onFile: (file: ParsedFile) => void
  onSheet: (index: number) => void
  onHeaderRow: (row: number) => void
  onContinue: () => void
}

const ERROR_KEYS = {
  too_large: "importErrorTooLarge",
  too_many_rows: "importErrorTooManyRows",
  unsupported: "importErrorUnsupported",
  xls_unsupported: "importErrorXls",
  empty: "importErrorEmpty",
  unreadable: "importErrorUnreadable",
} as const

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Step 1: choose the file, the sheet and which row holds the column names. */
export function ImportUploadStep({
  file,
  sheetIndex,
  headerRow,
  rowCount,
  headerCount,
  onFile,
  onSheet,
  onHeaderRow,
  onContinue,
}: Props) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(selected: File | undefined) {
    if (!selected) return
    setReading(true)
    setError(null)
    try {
      onFile(await parseImportFile(selected))
    } catch (e) {
      const code = e instanceof ImportFileError ? e.code : "unreadable"
      setError(t(ERROR_KEYS[code]))
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const sheet = file?.sheets[sheetIndex]
  const preview = sheet?.matrix.slice(0, 7) ?? []
  const columns = Math.min(
    12,
    preview.reduce((max, row) => Math.max(max, row.length), 0)
  )

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-[#d3c3b2] bg-[#faf8f6]"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          {reading ? (
            <Loader2Icon className="size-6 animate-spin" aria-hidden />
          ) : (
            <UploadIcon className="size-6" aria-hidden />
          )}
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            {reading ? t("importReading") : t("importDropTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("importDropHint").replace("{rows}", MAX_IMPORT_ROWS.toLocaleString("da-DK"))}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.txt"
          className="sr-only"
          aria-label={t("importChooseFile")}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button type="button" disabled={reading} onClick={() => inputRef.current?.click()}>
          {file ? t("importChooseOther") : t("importChooseFile")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("importGoogleHint")}</p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {file && sheet ? (
        <section className={cn(adminSectionCardClass, "space-y-4 p-4 sm:p-5")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheetIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={file.fileName}>
                {file.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} ·{" "}
                {t("importRowsFound").replace("{count}", rowCount.toLocaleString("da-DK"))} ·{" "}
                {t("importColumnsFound").replace("{count}", String(headerCount))}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {file.sheets.length > 1 ? (
                <div className="grid gap-1.5 text-sm">
                  <span className="font-medium">{t("importSheet")}</span>
                  <Select
                    value={String(sheetIndex)}
                    onValueChange={(v) => v != null && onSheet(Number(v))}
                  >
                    <SelectTrigger className={adminSelectTriggerClass}>
                      <SelectValue>{sheet.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      align="start"
                      style={{ minWidth: "var(--anchor-width)", maxWidth: "calc(100vw - 2rem)" }}
                    >
                      {file.sheets.map((item, index) => (
                        <SelectItem key={`${item.name}-${index}`} value={String(index)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">{t("importHeaderRow")}</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, sheet.matrix.length)}
                  className={cn(
                    adminFieldClass,
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  )}
                  value={headerRow}
                  onChange={(e) => {
                    const next = Math.trunc(Number(e.target.value))
                    if (Number.isFinite(next) && next >= 1) {
                      onHeaderRow(Math.min(next, Math.max(1, sheet.matrix.length)))
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{t("importHeaderRowHint")}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#e8e0d8]">
            <table className="w-full min-w-max border-collapse text-xs">
              <tbody className="divide-y divide-[#efe8e0]">
                {preview.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      index + 1 === headerRow && "bg-primary/10 font-semibold",
                      index + 1 < headerRow && "text-muted-foreground/60"
                    )}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{index + 1}</td>
                    {Array.from({ length: columns }, (_, column) => (
                      <td key={column} className="max-w-[12rem] truncate px-2 py-1.5">
                        {row[column] === null || row[column] === undefined
                          ? ""
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={headerCount === 0 || rowCount === 0}
              onClick={onContinue}
            >
              {t("importContinue")}
            </Button>
          </div>
          {headerCount === 0 || rowCount === 0 ? (
            <p className="text-right text-xs text-red-700">{t("importNoRows")}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
