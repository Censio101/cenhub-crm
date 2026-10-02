"use client"

import { useMemo, useState } from "react"
import { PlusIcon, SparklesIcon, XIcon } from "lucide-react"

import {
  adminOutlineButtonClass,
  adminSelectTriggerClass,
} from "@/components/admin/admin-ui-styles"
import { ImportQuickPreview } from "@/components/admin/import/ImportQuickPreview"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IMPORT_STANDARD_TARGETS, type ImportTarget } from "@/lib/import/column-mapping"
import { cellText } from "@/lib/import/parse-values"
import type { ColumnMapping, ImportOptions, ImportRowInput } from "@/lib/import/types"
import type { MessageKey } from "@/lib/i18n"
import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { LEAD_STATUSES, type LeadPlatformId, type LeadStatusId } from "@/lib/leads"

const NONE = "__none__"

type CustomTarget = { target: string; label: string }

type Props = {
  slug: string
  headers: string[]
  rows: ImportRowInput[]
  mapping: ColumnMapping
  onMapping: (mapping: ColumnMapping) => void
  onAutoMatch: () => void
  options: ImportOptions
  onOptions: (options: ImportOptions) => void
  customTargets: CustomTarget[]
  sheetColumns: LeadSheetTemplateColumn[]
  onBack: () => void
  onContinue: () => void
}

const PLATFORMS: { id: LeadPlatformId | ""; labelKey: MessageKey }[] = [
  { id: "", labelKey: "importSourceNone" },
  { id: "website", labelKey: "funnelPlatformWebsite" },
  { id: "landing", labelKey: "funnelPlatformLanding" },
  { id: "meta", labelKey: "dashboardFunnelMeta" },
]

/** Step 2: pick, for every lead field, which column of the file fills it. */
export function ImportMapStep({
  slug,
  headers,
  rows,
  mapping,
  onMapping,
  onAutoMatch,
  options,
  onOptions,
  customTargets,
  sheetColumns,
  onBack,
  onContinue,
}: Props) {
  const { t } = useLanguage()
  const [combining, setCombining] = useState(false)
  const mappedCount = Object.keys(mapping).length
  const canContinue = Boolean(
    mapping.fullName?.length || mapping.email?.length || mapping.phone?.length
  )

  const targets = useMemo<(ImportTarget & { label: string })[]>(
    () => [
      ...IMPORT_STANDARD_TARGETS.map((target) => ({
        target,
        label: t(builtinColumnLabelKey(target === "serviceIds" ? "serviceIds" : target)),
      })),
      ...customTargets.map((custom) => ({ target: custom.target, label: custom.label })),
    ],
    [customTargets, t]
  )

  function setColumn(target: string, index: number, header: string | null) {
    const current = [...(mapping[target] ?? [])]
    if (header === null) current.splice(index, 1)
    else current[index] = header
    const next = { ...mapping }
    if (current.filter(Boolean).length === 0) delete next[target]
    else next[target] = current.filter(Boolean)
    onMapping(next)
  }

  const sampleOf = (header: string | undefined) => {
    if (!header) return ""
    for (const row of rows.slice(0, 20)) {
      const text = cellText(row.values[header], 60)
      if (text) return text
    }
    return ""
  }

  const columnSelect = (target: string, index: number, label: string) => {
    const value = mapping[target]?.[index]
    return (
      <Select
        value={value ?? NONE}
        onValueChange={(v) => setColumn(target, index, v === NONE || v == null ? null : String(v))}
      >
        <SelectTrigger className="h-9 w-full min-w-0 rounded-lg border-[#d3c3b2] bg-white px-2.5 text-sm">
          <SelectValue>
            {value ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{value}</span>
                <span className="truncate text-xs text-muted-foreground">{sampleOf(value)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t("importNotMapped")}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="max-h-80"
          style={{ minWidth: "max(var(--anchor-width), 20rem)", maxWidth: "calc(100vw - 2rem)" }}
          aria-label={label}
        >
          <SelectItem value={NONE}>{t("importNotMapped")}</SelectItem>
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{header}</span>
                <span className="truncate text-xs text-muted-foreground">{sampleOf(header)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t("importMapIntro")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={adminOutlineButtonClass}
          onClick={onAutoMatch}
        >
          <SparklesIcon className="size-4" aria-hidden />
          {t("funnelMapAuto")}
        </Button>
      </div>

      <div className="space-y-2.5">
        {targets.map(({ target, label }) => {
          const columns = mapping[target] ?? []
          const isName = target === "fullName"
          const showSecond = isName && (columns.length > 1 || combining)
          return (
            <div
              key={target}
              className="grid gap-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start sm:gap-3"
            >
              <p className="flex items-center gap-1.5 pt-1.5 text-sm font-medium">
                {label}
                {isName ? (
                  <span className="rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
                    {t("importNeedOne")}
                  </span>
                ) : null}
              </p>
              <div className="min-w-0 space-y-1.5">
                {columnSelect(target, 0, label)}
                {showSecond ? (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">{columnSelect(target, 1, label)}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("importRemoveColumn")}
                      onClick={() => {
                        setCombining(false)
                        setColumn(target, 1, null)
                      }}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ) : isName && columns.length === 1 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setCombining(true)}
                  >
                    <PlusIcon className="size-3" aria-hidden />
                    {t("importCombineName")}
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <section className="space-y-3 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
        <h4 className="text-sm font-semibold">{t("importOptions")}</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("importDefaultStatus")}</span>
            <Select
              value={options.defaultStatus}
              onValueChange={(v) =>
                v != null && onOptions({ ...options, defaultStatus: v as LeadStatusId })
              }
            >
              <SelectTrigger className={adminSelectTriggerClass}>
                <SelectValue>{t(`leadStatus_${options.defaultStatus}` as MessageKey)}</SelectValue>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                align="start"
                style={{ minWidth: "var(--anchor-width)" }}
              >
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {t(`leadStatus_${status.id}` as MessageKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("importDefaultSource")}</span>
            <Select
              value={options.defaultPlatform || NONE}
              onValueChange={(v) =>
                v != null &&
                onOptions({
                  ...options,
                  defaultPlatform: (v === NONE ? "" : v) as LeadPlatformId | "",
                })
              }
            >
              <SelectTrigger className={adminSelectTriggerClass}>
                <SelectValue>
                  {t(
                    PLATFORMS.find((p) => p.id === options.defaultPlatform)?.labelKey ??
                      "importSourceNone"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                align="start"
                style={{ minWidth: "var(--anchor-width)" }}
              >
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform.id || NONE} value={platform.id || NONE}>
                    {t(platform.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary,#e4660c)]"
            checked={options.skipDuplicates}
            onChange={(e) => onOptions({ ...options, skipDuplicates: e.target.checked })}
          />
          <span>
            <span className="font-medium">{t("importSkipDuplicates")}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t("importSkipDuplicatesHint")}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">{t("importQuickTitle")}</h4>
        <ImportQuickPreview
          slug={slug}
          rows={rows}
          mapping={mapping}
          options={options}
          columns={sheetColumns}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe7de] pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("importBack")}
        </Button>
        <div className="flex items-center gap-3">
          {!canContinue ? (
            <span className="text-xs text-red-700">{t("importNeedContact")}</span>
          ) : (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("importMappedCount").replace("{count}", String(mappedCount))}
            </span>
          )}
          <Button type="button" disabled={!canContinue} onClick={onContinue}>
            {t("importRunTest")}
          </Button>
        </div>
      </div>
    </div>
  )
}
