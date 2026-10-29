"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"

import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { ClientCorePageShell } from "@/components/client/ClientCorePageShell"
import { useClientNavigation } from "@/components/client/ClientNavigationProvider"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { ClientBoardLoadingState } from "@/components/client/ClientBoardLoadingState"
import { AddLeadDialog, EditLeadDialog } from "@/components/leads/AddLeadDialog"
import { LeadSheetSortableHeader } from "@/components/leads/LeadSheetSortableHeader"
import { LeadSheetFilterBar } from "@/components/leads/LeadSheetFilterBar"
import { LeadSheetFocusShell } from "@/components/leads/LeadSheetFocusShell"
import {
  LeadSheetReadOnlyDateCell,
  LeadSheetReadOnlyWonDateCell,
  LeadSheetReadOnlyEmailCell,
  LeadSheetReadOnlyFullNameCell,
  LeadSheetReadOnlyPhoneCell,
  LeadSheetReadOnlyPlainCell,
  LeadSheetReadOnlySegmentCell,
} from "@/components/leads/LeadSheetReadOnlyCell"
import { LeadImageFieldCell } from "@/components/leads/LeadImageFieldCell"
import { LeadSheetNoteCell } from "@/components/leads/LeadSheetNoteCell"
import { LeadCardList } from "@/components/leads/LeadCardList"
import { LeadSheetBulkSelectionBar } from "@/components/leads/LeadSheetBulkSelectionBar"
import { LeadSheetToolbarMenu } from "@/components/leads/LeadSheetToolbarMenu"
import { LeadSheetLeadQuickView } from "@/components/leads/LeadSheetLeadQuickView"
import { LeadSheetScrollArea } from "@/components/leads/LeadSheetScrollArea"
import { LeadSheetViewControls } from "@/components/leads/LeadSheetViewControls"
import { LeadStatusTableCell } from "@/components/leads/LeadStatusTableCell"
import { SaveStatusBadge } from "@/components/leads/SaveStatusBadge"
import { useLeadSelectOptions } from "@/components/leads/useLeadSelectOptions"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useSheetViewState } from "@/hooks/useSheetViewState"
import type { FunnelId } from "@/lib/performance/funnels"
import type { DateRange } from "@/lib/performance/types"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { canDeleteLeads } from "@/lib/auth/permissions"
import {
  useLeadSheetColumnLayout,
  type LeadSheetColumnLayout,
} from "@/hooks/useLeadSheetColumnLayout"
import { useLeads } from "@/hooks/useLeads"
import { LeadPipelineBar } from "@/components/leads/LeadPipelineBar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  matchesStatusFilter,
  type StatusFilterValue,
} from "@/lib/leads/status-filter-groups"
import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import { isServiceId, resolveServiceLabel } from "@/lib/performance/services"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import { leadSegmentLabelKey, leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import {
  computeLeadPipelineStats,
  filterDashboardLeads,
  formatLeadServices,
  getLeadServiceIds,
  getWonLeadCellClass,
  getWonLeadRowClass,
  type Lead,
  type LeadPipelineStats,
  type LeadSegmentId,
  type LeadStatusId,
} from "@/lib/leads"
import { downloadCsv, plainCell, toCsv } from "@/lib/leads/export-csv"
import { missingPriceCellClass } from "@/lib/leads/won-sales-price"
import { formatLeadDateTime } from "@/lib/leads/lead-datetime"
import { leadMatchesServiceFilter } from "@/lib/leads/service-filter"
import { matchesSearch } from "@/lib/leads/search"
import {
  findDefaultDateColumnId,
  isColumnSortable,
  sortLeadsWithSheetState,
  type SheetSortDirection,
  type SheetSortState,
} from "@/lib/leads/sheet-sort"
import { cn } from "cn"

const cellInputClass =
  "h-8 w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-white focus:ring-1 focus:ring-ring select-text"

const leadHeaderCellClass =
  "sticky top-0 z-[2] h-11 border-b border-r border-white/15 bg-[#3f3a36] px-3 text-xs font-medium text-white"

/** Pinned sheet columns must stack above scrolling cells (open dropdown triggers use z-[6]). */
const SHEET_Z_PINNED_BODY = "z-[20]"
const SHEET_Z_PINNED_BODY_EDGE = "z-[21]"
const SHEET_Z_PINNED_HEADER = "z-[30]"
const SHEET_Z_PINNED_HEADER_EDGE = "z-[31]"

function parseMoney(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return null
  const amount = Number(digits)
  return Number.isFinite(amount) ? amount : null
}

function CurrencyInput({
  value,
  label,
  emphasizePositive,
  disabled,
  onChange,
}: {
  value: number | null
  label: string
  emphasizePositive?: boolean
  disabled?: boolean
  onChange: (value: number | null) => void
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")

  return (
    <input
      inputMode="numeric"
      value={focused ? draft : value == null ? "" : formatCurrencyDKK(value)}
      placeholder="–"
      aria-label={label}
      disabled={disabled}
      className={cn(
        cellInputClass,
        "text-right tabular-nums",
        disabled && "cursor-not-allowed opacity-60",
        emphasizePositive && value != null && value > 0 ? "text-success-foreground" : ""
      )}
      onFocus={() => {
        setDraft(value == null ? "" : String(value))
        setFocused(true)
      }}
      onChange={(event) => {
        setDraft(event.target.value)
        onChange(parseMoney(event.target.value))
      }}
      onBlur={() => setFocused(false)}
    />
  )
}

function CellSelect<T extends string>({
  value,
  placeholder,
  options,
  onChange,
  className,
  disabled,
  label,
  optionClassName,
}: {
  value: T | ""
  placeholder: string
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (value: T | "") => void
  className?: string
  disabled?: boolean
  label: string
  optionClassName?: (id: T) => string
}) {
  return (
    <Select
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next !== "string") {
          onChange("")
          return
        }
        onChange(next as T)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn(
          "h-8 min-w-[8.5rem] border-0 bg-transparent px-1.5 shadow-none hover:bg-transparent",
          className
        )}
      >
        <SelectValue placeholder={placeholder}>
          {options.find((option) => option.id === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="z-[80]">
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id} className={optionClassName?.(option.id)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const SHEET_DROPDOWN_TRIGGER_CLASS =
  "relative flex h-8 w-full min-w-0 max-w-full items-center justify-between gap-1.5 rounded-full border border-[#e4ddd4] bg-white px-2.5 text-left text-[13px] shadow-[0_1px_2px_rgba(26,18,8,0.06)] outline-none transition-[border-color,box-shadow] hover:border-[#d3c3b2] hover:bg-white hover:shadow-[0_1px_3px_rgba(26,18,8,0.08)] data-[popup-open]:border-primary/35 data-[popup-open]:bg-white data-[popup-open]:shadow-[0_2px_6px_rgba(26,18,8,0.1)] focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"

const SHEET_DROPDOWN_PANEL_CLASS =
  "z-[80] w-52 rounded-xl border border-[#e4ddd4] bg-white p-1 shadow-[0_8px_22px_rgba(26,18,8,0.12)]"

/** Single-select custom column: popover picker (no inline text field). */
function LeadSheetSelectCell({
  value,
  options,
  label,
  placeholder,
  onChange,
  disabled,
}: {
  value: string
  options: ReadonlyArray<{ id: string; label: string }>
  label: string
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const display =
    options.find((option) => option.id === value)?.label ??
    (value ? value : null)

  return (
    <div className="w-full min-w-0 max-w-full py-0.5" data-lead-sheet-no-pan="true">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={label}
          disabled={disabled}
          data-lead-sheet-dropdown=""
          className={cn(SHEET_DROPDOWN_TRIGGER_CLASS, disabled && "cursor-not-allowed opacity-60")}
        >
          <span className={cn("min-w-0 flex-1 truncate", !display && "text-muted-foreground")}>
            {display ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" alignOffset={4} className={SHEET_DROPDOWN_PANEL_CLASS}>
          <ul className="max-h-52 overflow-y-auto" role="listbox" aria-label={label}>
          {options.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted-foreground">{t("leadSheetSelectEmpty")}</li>
          ) : (
            options.map((option) => {
              const selected = option.id === value
              return (
                <li key={option.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-sm hover:bg-[#f7f3ee]",
                      selected && "bg-primary/10 font-medium text-primary"
                    )}
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      )}
                    >
                      {selected ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                </li>
              )
            })
          )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ServiceMultiSelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string[]
  onChange: (value: string[]) => void
  label: string
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const { enabledServices } = useCompanyServices()
  const options = useMemo(() => {
    const enabledIds = new Set(enabledServices.map((service) => service.id))
    const extras = value
      .filter((id) => !enabledIds.has(id))
      .map((id) => ({ id, label: resolveServiceLabel(id, enabledServices) }))
    return [...enabledServices, ...extras]
  }, [enabledServices, value])
  const summary = formatLeadServices({ serviceIds: value }, enabledServices)

  function toggle(id: string) {
    const next = value.includes(id) ? value.filter((item) => item !== id) : [...value, id]
    onChange(options.map((service) => service.id).filter((item) => next.includes(item)))
  }

  return (
    <div className="w-full min-w-0 max-w-full py-0.5" data-lead-sheet-no-pan="true">
      <Popover>
        <PopoverTrigger
          aria-label={label}
          disabled={disabled}
          data-lead-sheet-dropdown=""
          className={cn(SHEET_DROPDOWN_TRIGGER_CLASS, disabled && "cursor-not-allowed opacity-60")}
        >
          <span className={cn("min-w-0 flex-1 truncate", !summary && "text-muted-foreground")}>
            {summary || "Service"}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" alignOffset={4} className={cn(SHEET_DROPDOWN_PANEL_CLASS, "gap-0.5")}>
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("leadSheetNoServices")}</p>
        ) : (
          options.map((service) => {
            const checked = value.includes(service.id)
            return (
              <button
                key={service.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                className="flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-sm hover:bg-[#f7f3ee]"
                onClick={() => toggle(service.id)}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background"
                  )}
                >
                  {checked ? <CheckIcon className="size-3" /> : null}
                </span>
                {service.label}
              </button>
            )
          })
        )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function DeleteLeadButton({ leadName, onDelete }: { leadName: string; onDelete: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("leadSheetDeleteLeadConfirm")}
            className="text-muted-foreground hover:text-danger-foreground"
          />
        }
      >
        <Trash2Icon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 bg-[#f7f7f5] p-3">
        <PopoverHeader>
          <PopoverTitle>{t("leadSheetDeleteLead")}</PopoverTitle>
          <PopoverDescription>{leadName || t("leadSheetDeleteLead")}</PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("leadSheetCancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            {t("leadSheetDeleteLeadConfirm")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function LeadPipelineFooter({ stats }: { stats: LeadPipelineStats }) {
  const { t } = useLanguage()
  return (
    <div
      aria-live="polite"
      className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-[#f7f7f5] px-4 py-2.5 sm:px-6"
    >
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <FooterStat
          label={t("leadSheetPipelineLost")}
          value={formatCurrencyDKK(stats.lostValue)}
          tone="danger"
        />
        <FooterStat
          label={t("leadSheetPipelineOpen")}
          value={formatCurrencyDKK(stats.pipelineValue)}
          tone="open"
        />
        <FooterStat
          label={t("leadSheetPipelineWon")}
          value={formatCurrencyDKK(stats.wonValue)}
          tone="success"
        />
        <FooterStat
          label={t("leadSheetPipelineCloseRate")}
          value={stats.closeRate == null ? "–" : formatPercentage(stats.closeRate)}
        />
        <FooterStat
          label={t("leadSheetPipelineAvgSale")}
          value={stats.averageWonSales == null ? "–" : formatCurrencyDKK(stats.averageWonSales)}
          tone="success"
        />
        <FooterStat
          label={t("leadSheetPipelineAvgProfit")}
          value={stats.averageWonProfit == null ? "–" : formatCurrencyDKK(stats.averageWonProfit)}
          tone="success"
        />
      </dl>
    </div>
  )
}

function FooterStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "danger" | "open"
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" && "text-[#15803d]",
          tone === "open" && "text-[#1d4ed8]",
          tone === "danger" && "text-[#b91c1c]"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

const ACTIONS_COL_PX = 108
const SELECT_COL_PX = 44

export type LeadSheetBulkSelection = {
  selectedIds: ReadonlySet<string>
  onToggle: (leadId: string) => void
  onToggleAllVisible: (select: boolean) => void
}

function columnBoxStyle(
  columnLayout: LeadSheetColumnLayout | undefined,
  col: LeadSheetTemplateColumn,
  colIndex: number,
  selectOffset: number
): { style?: CSSProperties } {
  if (!columnLayout) return {}
  const w = columnLayout.widthForColumn(col)
  const left = columnLayout.stickyLeftPx(colIndex)
  return {
    style: {
      width: w,
      minWidth: w,
      maxWidth: w,
      ...(left !== undefined ? { left: left + selectOffset } : {}),
    },
  }
}

function LeadSheetSelectAllCheckbox({
  leads,
  selectedIds,
  onToggleAllVisible,
}: {
  leads: readonly Lead[]
  selectedIds: ReadonlySet<string>
  onToggleAllVisible: (select: boolean) => void
}) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const allSelected =
    leads.length > 0 && leads.every((lead) => selectedIds.has(lead.id))
  const someSelected = leads.some((lead) => selectedIds.has(lead.id))

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someSelected && !allSelected
    }
  }, [allSelected, someSelected])

  return (
    <input
      ref={inputRef}
      type="checkbox"
      className="size-3.5 cursor-pointer accent-primary"
      aria-label={t("leadSheetSelectAll")}
      checked={allSelected}
      onChange={(e) => onToggleAllVisible(e.target.checked)}
    />
  )
}

const bulkSelectColumnAttrs = {
  "data-lead-sheet-no-pan": "true",
  "data-lead-sheet-bulk-select-cell": "true",
} as const

const bulkSelectHitTargetClass =
  "flex h-12 w-full cursor-pointer items-center px-2 select-none"

export function LeadsTable({
  columns,
  leads,
  emptyText,
  sheetSort,
  onSheetSort,
  onUpdate,
  onEdit,
  onDelete,
  separatePinnedColumns = false,
  columnLayout,
  detailColumns,
  bulkSelection,
  canDelete = false,
}: {
  /** Only client admins (and Censio admins) see the delete button. */
  canDelete?: boolean
  columns: LeadSheetTemplateColumn[]
  /** Full template columns for the read-only quick-view popup (defaults to visible columns). */
  detailColumns?: readonly LeadSheetTemplateColumn[]
  bulkSelection?: LeadSheetBulkSelection
  leads: Lead[]
  emptyText: string
  sheetSort: SheetSortState
  onSheetSort: (columnId: string, direction: SheetSortDirection | null) => void
  onUpdate: (id: string, patch: Partial<Lead>) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  /** Customer sheet: the two frozen columns read as fixed, and the rest as the scrolling area. */
  separatePinnedColumns?: boolean
  columnLayout?: LeadSheetColumnLayout
}) {
  const { t } = useLanguage()
  const { statuses } = useLeadSelectOptions()
  const selectOffset = bulkSelection ? SELECT_COL_PX : 0
  const colSpan = columns.length + 1 + (bulkSelection ? 1 : 0)
  const quickViewColumns = detailColumns ?? columns

  function headerLabel(col: LeadSheetTemplateColumn) {
    return columnDisplayLabel(col, t)
  }

  function stickyCellClass(colIndex: number) {
    if (columnLayout) {
      return cn(
        "px-2",
        colIndex <= 1 && cn("sticky bg-card", SHEET_Z_PINNED_BODY),
        colIndex === 1 && "border-r border-border"
      )
    }
    return colIndex === 0
      ? cn("sticky left-0 w-36 min-w-36 px-2 bg-card", SHEET_Z_PINNED_BODY)
      : colIndex === 1
        ? cn("sticky left-36 min-w-44 border-r border-border px-2 bg-card", SHEET_Z_PINNED_BODY)
        : "px-2"
  }

  function cellBox(col: LeadSheetTemplateColumn, colIndex: number) {
    return columnBoxStyle(columnLayout, col, colIndex, selectOffset)
  }

  function renderColumnCell(lead: Lead, col: LeadSheetTemplateColumn, colIndex: number) {
    const priceCue = missingPriceCellClass(lead, col)
    const box = cellBox(col, colIndex)

    // Sticky first two columns follow template order (not always date + name).
    const stickyFirst = stickyCellClass(colIndex)

    const stickyBg = cn(
      stickyFirst,
      getWonLeadCellClass(lead.status) || (colIndex <= 1 && !columnLayout ? "bg-card" : ""),
      priceCue
    )
    const stickyLayout =
      columnLayout && colIndex <= 1 && box.style ? { style: box.style } : {}

    if (col.kind === "custom") {
      const key = col.customField.fieldKey
      const value = lead.customFields?.[key]
      const patchCustom = (next: unknown) =>
        onUpdate(lead.id, { customFields: { ...lead.customFields, [key]: next } })

      if (col.customField.fieldType === "image") {
        return (
          <TableCell key={col.id} className={cn("min-w-40 px-2", priceCue)}>
            <LeadImageFieldCell
              leadId={lead.id}
              fieldKey={key}
              value={value}
              onChange={(next) => patchCustom(next)}
            />
          </TableCell>
        )
      }

      if (col.customField.fieldType === "textarea") {
        return (
          <TableCell key={col.id} className={cn("min-w-44 max-w-[15rem] px-2 py-1.5", priceCue)}>
            <LeadSheetNoteCell
              value={typeof value === "string" ? value : ""}
              fieldLabel={col.customField.label}
              leadName={lead.fullName}
              onChange={(next) => patchCustom(next)}
            />
          </TableCell>
        )
      }

      if (col.customField.fieldType === "number") {
        return (
          <TableCell key={col.id} className={cn("min-w-28 px-2", priceCue)}>
            <input
              type="number"
              value={typeof value === "number" ? value : ""}
              className={cellInputClass}
              onChange={(e) => patchCustom(e.target.value === "" ? null : Number(e.target.value))}
            />
          </TableCell>
        )
      }

      if (col.customField.fieldType === "select") {
        const options = col.customField.config.options ?? []
        const current = typeof value === "string" ? value : ""
        // A value whose option was removed from the column stays visible, marked "removed".
        const cellOptions = options.map((o) => ({ id: o, label: o }))
        if (current && !options.includes(current)) {
          cellOptions.push({ id: current, label: `${current} (${t("leadSheetSelectRemoved")})` })
        }
        return (
          <TableCell key={col.id} className={cn("min-w-0 max-w-full px-1", priceCue)}>
            <LeadSheetSelectCell
              value={current}
              label={col.customField.label}
              placeholder={t("leadSheetSelectPlaceholder")}
              options={cellOptions}
              onChange={(v) => patchCustom(v)}
            />
          </TableCell>
        )
      }

      const inputType =
        col.customField.fieldType === "date"
          ? "date"
          : col.customField.fieldType === "time"
            ? "time"
            : "text"

      return (
        <TableCell key={col.id} className={cn("min-w-36 px-2", priceCue)}>
          <input
            type={inputType}
            value={typeof value === "string" ? value : ""}
            className={cellInputClass}
            onChange={(e) => patchCustom(e.target.value)}
          />
        </TableCell>
      )
    }

    switch (col.builtinKey) {
      case "date":
        return (
          <LeadSheetReadOnlyDateCell
            key={col.id}
            lead={lead}
            className={stickyBg}
            style={stickyLayout.style}
          />
        )
      case "fullName":
        return (
          <LeadSheetReadOnlyFullNameCell
            key={col.id}
            lead={lead}
            className={stickyBg}
            style={stickyLayout.style}
          />
        )
      case "email":
        return <LeadSheetReadOnlyEmailCell key={col.id} lead={lead} className={priceCue} />
      case "phone":
        return <LeadSheetReadOnlyPhoneCell key={col.id} lead={lead} className={priceCue} />
      case "segment":
        return (
          <LeadSheetReadOnlySegmentCell key={col.id} lead={lead} className={cn("px-1", priceCue)} />
        )
      case "companyName":
        return (
          <LeadSheetReadOnlyPlainCell
            key={col.id}
            value={lead.companyName}
            className={cn("min-w-44 px-2", priceCue)}
          />
        )
      case "address":
        return (
          <LeadSheetReadOnlyPlainCell
            key={col.id}
            value={lead.address}
            className={cn("min-w-44 px-2", priceCue)}
          />
        )
      case "zipCode":
        return (
          <LeadSheetReadOnlyPlainCell
            key={col.id}
            value={lead.zipCode}
            className={cn("min-w-24 px-2", priceCue)}
          />
        )
      case "city":
        return (
          <LeadSheetReadOnlyPlainCell
            key={col.id}
            value={lead.city}
            className={cn("min-w-32 px-2", priceCue)}
          />
        )
      case "serviceIds":
        return (
          <TableCell key={col.id} className={cn("min-w-0 max-w-full px-1", priceCue)}>
            <ServiceMultiSelect
              value={getLeadServiceIds(lead)}
              label={t("leadSheetColServiceIds")}
              onChange={(serviceIds) => {
                const first = serviceIds[0] ?? ""
                onUpdate(lead.id, {
                  serviceIds,
                  service: isServiceId(first) ? first : "",
                })
              }}
            />
          </TableCell>
        )
      case "metaAdId":
        return (
          <LeadSheetReadOnlyPlainCell
            key={col.id}
            value={lead.metaAdId}
            className={cn("min-w-48 px-2", priceCue)}
            mono
          />
        )
      case "wonDate":
        return (
          <LeadSheetReadOnlyWonDateCell
            key={col.id}
            lead={lead}
            className={cn("min-w-28 px-2", priceCue)}
          />
        )
      case "status":
        return (
          <LeadStatusTableCell
            key={`${lead.id}-${col.id}`}
            status={lead.status}
            label={t("leadSheetColStatus")}
            options={statuses}
            onStatusChange={(status) => onUpdate(lead.id, { status })}
          />
        )
      case "salesPrice":
        return (
          <TableCell key={col.id} className={cn("min-w-32 px-2", priceCue)}>
            <CurrencyInput
              value={lead.salesPrice}
              label={t("leadSheetColSalesPrice")}
              onChange={(salesPrice) => onUpdate(lead.id, { salesPrice })}
            />
          </TableCell>
        )
      case "profit":
        return (
          <TableCell key={col.id} className={cn("min-w-32 px-2", priceCue)}>
            <CurrencyInput
              value={lead.profit}
              label={t("leadSheetColProfit")}
              emphasizePositive
              onChange={(profit) => onUpdate(lead.id, { profit })}
            />
          </TableCell>
        )
      case "ltv":
        return (
          <TableCell key={col.id} className={cn("min-w-32 px-2", priceCue)}>
            <CurrencyInput
              value={lead.ltv}
              label={t("leadSheetColLtv")}
              onChange={(ltv) => onUpdate(lead.id, { ltv })}
            />
          </TableCell>
        )
      default:
        return null
    }
  }

  const tableMinWidth = columnLayout
    ? columns.reduce((sum, col) => sum + columnLayout.widthForColumn(col), 0) +
        ACTIONS_COL_PX +
        selectOffset
    : undefined

  return (
    <Table
      containerClassName="overflow-visible"
      className={cn(
        "border-separate border-spacing-0",
        columnLayout &&
          "table-fixed [&_td]:!min-w-0 [&_th]:!min-w-0 [&_td]:overflow-visible [&_th]:overflow-visible [&_[data-popup-open]]:relative [&_[data-popup-open]]:z-[6]",
        !columnLayout && "min-w-[96rem]"
      )}
      style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}
    >
      {columnLayout ? (
        <colgroup>
          {bulkSelection ? (
            <col style={{ width: SELECT_COL_PX, minWidth: SELECT_COL_PX }} />
          ) : null}
          {columns.map((col) => {
            const w = columnLayout.widthForColumn(col)
            return <col key={col.id} style={{ width: w, minWidth: w }} />
          })}
          <col style={{ width: ACTIONS_COL_PX, minWidth: ACTIONS_COL_PX }} />
        </colgroup>
      ) : null}
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {bulkSelection ? (
            <TableHead
              {...bulkSelectColumnAttrs}
              className={cn(
                leadHeaderCellClass,
                cn(
                  "sticky left-0 w-11 min-w-11 cursor-pointer p-0",
                  SHEET_Z_PINNED_HEADER_EDGE
                ),
                columnLayout && "border-r border-white/15"
              )}
            >
              <label className="flex h-11 w-full cursor-pointer items-center px-2 select-none">
                <LeadSheetSelectAllCheckbox
                  leads={leads}
                  selectedIds={bulkSelection.selectedIds}
                  onToggleAllVisible={bulkSelection.onToggleAllVisible}
                />
              </label>
            </TableHead>
          ) : null}
          {columns.map((col, index) => {
            const label = headerLabel(col)
            const sortable = isColumnSortable(col)
            const box = cellBox(col, index)
            const headInner = sortable ? (
              <LeadSheetSortableHeader
                columnId={col.id}
                label={label}
                sort={sheetSort}
                onSort={onSheetSort}
              />
            ) : (
              <span className="block truncate">{label}</span>
            )
            return (
              <TableHead
                key={col.id}
                className={cn(
                  leadHeaderCellClass,
                  columnLayout
                    ? cn(
                        "px-2",
                        index <= 1 && cn("sticky", SHEET_Z_PINNED_HEADER),
                        index === 1 && "border-r border-white/15"
                      )
                    : cn(
                        bulkSelection &&
                          index === 0 &&
                          cn("sticky left-11 w-36 min-w-36", SHEET_Z_PINNED_HEADER),
                        bulkSelection &&
                          index === 1 &&
                          cn("sticky left-[calc(2.75rem+9rem)] min-w-44", SHEET_Z_PINNED_HEADER),
                        !bulkSelection &&
                          index === 0 &&
                          cn("sticky left-0 w-36 min-w-36", SHEET_Z_PINNED_HEADER),
                        !bulkSelection &&
                          index === 1 &&
                          cn("sticky left-36 min-w-44", SHEET_Z_PINNED_HEADER)
                      )
                )}
                style={columnLayout ? box.style : undefined}
                title={label}
              >
                {headInner}
              </TableHead>
            )
          })}
          <TableHead
            className={cn(
              leadHeaderCellClass,
              cn(
                "sticky right-0 w-[6.75rem] min-w-[6.75rem] border-r-0 border-l px-1 text-center",
                SHEET_Z_PINNED_HEADER
              )
            )}
          >
            <span className="sr-only">{t("leadSheetRowActions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_td]:border-b [&_td]:border-b-[#eee7de]">
        {leads.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={colSpan}
              className="px-4 py-10 text-center text-sm text-muted-foreground"
            >
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => (
            <TableRow
              key={lead.id}
              className={
                separatePinnedColumns
                  ? bulkSelection
                    ? "text-[#1f4d30] hover:bg-transparent [&>td:nth-child(2)]:bg-[#e8f3eb] [&>td:nth-child(3)]:bg-[#e8f3eb] [&>td:nth-child(n+4):not(:last-child):not([data-lead-status-cell])]:bg-white [&>td:nth-child(n+4):not(:last-child):not([data-lead-status-cell])]:text-foreground [&:hover>td:nth-child(2)]:bg-[#dceee1] [&:hover>td:nth-child(3)]:bg-[#dceee1] [&:hover>td:nth-child(n+4):not(:last-child):not([data-lead-status-cell])]:bg-[#f7f4ef]"
                    : "text-[#1f4d30] hover:bg-transparent [&>td:nth-child(-n+2)]:bg-[#e8f3eb] [&>td:nth-child(n+3):not(:last-child):not([data-lead-status-cell])]:bg-white [&>td:nth-child(n+3):not(:last-child):not([data-lead-status-cell])]:text-foreground [&:hover>td:nth-child(-n+2)]:bg-[#dceee1] [&:hover>td:nth-child(n+3):not(:last-child):not([data-lead-status-cell])]:bg-[#f7f4ef]"
                  : getWonLeadRowClass(lead.status)
              }
            >
              {bulkSelection ? (
                <TableCell
                  {...bulkSelectColumnAttrs}
                  className={cn(
                    cn(
                      "sticky left-0 w-11 min-w-11 cursor-pointer border-r border-[#eee7de] bg-card p-0",
                      SHEET_Z_PINNED_BODY_EDGE
                    ),
                    getWonLeadCellClass(lead.status)
                  )}
                >
                  <label className={bulkSelectHitTargetClass}>
                    <input
                      type="checkbox"
                      className="size-3.5 cursor-pointer accent-primary"
                      aria-label={t("leadSheetSelectRow")}
                      checked={bulkSelection.selectedIds.has(lead.id)}
                      onChange={() => bulkSelection.onToggle(lead.id)}
                    />
                  </label>
                </TableCell>
              ) : null}
              {columns.map((col, colIndex) => renderColumnCell(lead, col, colIndex))}
              <TableCell
                className={cn(
                  cn(
                    "sticky right-0 w-[6.75rem] min-w-[6.75rem] border-l border-border bg-card px-0.5",
                    SHEET_Z_PINNED_BODY
                  ),
                  getWonLeadCellClass(lead.status)
                )}
              >
                <div className="flex items-center justify-center gap-0">
                  <LeadSheetLeadQuickView lead={lead} columns={quickViewColumns} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("leadSheetEditLead")}
                    title={t("leadSheetEditLead")}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => onEdit(lead.id)}
                  >
                    <PencilIcon />
                  </Button>
                  {canDelete ? (
                    <DeleteLeadButton
                      leadName={lead.fullName.trim()}
                      onDelete={() => onDelete(lead.id)}
                    />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function LeadsBoard() {
  const { enabledServices, loaded: servicesLoaded } = useCompanyServices()
  const { t } = useLanguage()
  const { animateBoardEnter, markWorkspaceWarm } = useClientNavigation()
  const { view, pending, onPresetChange, onCustomRange: onSheetCustomRange } =
    useSheetViewState("/leads")
  const dateIsAllTime = view.preset === "all_time"
  const resetDate = useCallback(() => onPresetChange("all_time"), [onPresetChange])
  const {
    leads,
    leadSheet,
    loading,
    error,
    dataSource,
    saveStatus,
    updateLead,
    saveLead,
    createLead,
    deleteLead,
    deleteLeadsBulk,
    reload,
  } = useLeads({ liveSync: true })

  const { organization, role } = useActiveOrganization()
  const canBulkDeleteLeads = role === "censio_admin"
  const mayDeleteLeads = canDeleteLeads(role)

  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set<string>())
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const toggleLeadSelected = useCallback((leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }, [])

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds(new Set())
  }, [])

  const exitBulkSelectMode = useCallback(() => {
    setBulkSelectMode(false)
    clearLeadSelection()
    setBulkDeleteOpen(false)
  }, [clearLeadSelection])

  useEffect(() => {
    if (!loading) markWorkspaceWarm()
  }, [loading, markWorkspaceWarm])

  const leadDateSpan = useMemo(() => {
    let earliest: string | null = null
    let latest: string | null = null
    for (const lead of leads) {
      if (!lead.date) continue
      if (!earliest || lead.date < earliest) earliest = lead.date
      if (!latest || lead.date > latest) latest = lead.date
    }
    return { earliest, latest }
  }, [leads])
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all")
  const [sheetService, setSheetService] = useState<string | null>(null)
  const [sheetSegment, setSheetSegment] = useState<LeadSegmentId | "all">("all")
  const [sheetFunnel, setSheetFunnel] = useState<FunnelId | "all">("all")
  const [sheetSort, setSheetSort] = useState<SheetSortState>(null)
  const [search, setSearch] = useState("")
  const [sheetFocusOpen, setSheetFocusOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingLead = editingId ? (leads.find((lead) => lead.id === editingId) ?? null) : null

  const scoped = useMemo(
    () => filterDashboardLeads(leads, { range: view.range, ignoreDate: dateIsAllTime }),
    [dateIsAllTime, leads, view.range]
  )

  const sheetScoped = useMemo(
    () =>
      scoped.filter((lead) => {
        if (sheetSegment !== "all" && lead.segment !== sheetSegment) return false
        if (!leadMatchesServiceFilter(lead, sheetService, enabledServices)) return false
        if (sheetFunnel !== "all" && lead.platform !== sheetFunnel) return false
        return true
      }),
    [enabledServices, scoped, sheetFunnel, sheetSegment, sheetService]
  )

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<LeadStatusId, number>> = {}
    for (const lead of sheetScoped) {
      counts[lead.status] = (counts[lead.status] ?? 0) + 1
    }
    return counts
  }, [sheetScoped])

  const inFilters = useMemo(
    () => sheetScoped.filter((lead) => matchesStatusFilter(lead.status, statusFilter)),
    [sheetScoped, statusFilter]
  )

  const filtered = useMemo(() => {
    const searched = search.trim()
      ? inFilters.filter((lead) =>
          matchesSearch(
            [lead.fullName, lead.email, lead.phone, lead.companyName, lead.city, lead.address],
            search
          )
        )
      : inFilters
    return sortLeadsWithSheetState(searched, leadSheet.columns, sheetSort, enabledServices)
  }, [enabledServices, inFilters, leadSheet.columns, search, sheetSort])

  const toggleAllVisibleLeads = useCallback(
    (select: boolean) => {
      setSelectedLeadIds((prev) => {
        const next = new Set(prev)
        for (const lead of filtered) {
          if (select) next.add(lead.id)
          else next.delete(lead.id)
        }
        return next
      })
    },
    [filtered]
  )

  const bulkSelection = useMemo(
    (): LeadSheetBulkSelection => ({
      selectedIds: selectedLeadIds,
      onToggle: toggleLeadSelected,
      onToggleAllVisible: toggleAllVisibleLeads,
    }),
    [selectedLeadIds, toggleAllVisibleLeads, toggleLeadSelected]
  )

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedLeadIds]
    await deleteLeadsBulk(ids)
    exitBulkSelectMode()
  }, [deleteLeadsBulk, exitBulkSelectMode, selectedLeadIds])
  const columnLayout = useLeadSheetColumnLayout({
    page: "leads",
    organizationId: organization?.id,
    columns: leadSheet.columns,
    leads: filtered,
    enabledServices,
    t,
  })

  const sheetViewToolbar = (
    <LeadSheetViewControls
      displayMode={columnLayout.displayMode}
      onDisplayModeChange={columnLayout.setDisplayMode}
    />
  )

  const sheetToolbarLeading =
    canBulkDeleteLeads && !bulkSelectMode ? (
      <LeadSheetToolbarMenu onBulkSelect={() => setBulkSelectMode(true)} />
    ) : null

  const bulkSelectionForTable =
    canBulkDeleteLeads && bulkSelectMode ? bulkSelection : undefined

  const handleSheetSort = useCallback((columnId: string, direction: SheetSortDirection | null) => {
    setSheetSort(direction ? { columnId, direction } : null)
  }, [])

  const defaultSortApplied = useRef(false)
  useEffect(() => {
    if (defaultSortApplied.current || leadSheet.columns.length === 0) return
    defaultSortApplied.current = true
    const dateId = findDefaultDateColumnId(leadSheet.columns)
    if (dateId) {
      queueMicrotask(() => setSheetSort({ columnId: dateId, direction: "desc" }))
    }
  }, [leadSheet.columns])

  const pipelineStats = useMemo(() => computeLeadPipelineStats(filtered), [filtered])

  const leadsEmptyText = useMemo(() => {
    if (
      !dateIsAllTime &&
      !search.trim() &&
      statusFilter === "all" &&
      sheetSegment === "all" &&
      sheetFunnel === "all" &&
      !sheetService
    ) {
      return t("leadSheetEmptyPeriod")
    }
    return t("leadSheetEmptyFiltered")
  }, [
    dateIsAllTime,
    search,
    sheetFunnel,
    sheetSegment,
    sheetService,
    statusFilter,
    t,
  ])

  function exportFiltered() {
    const headers = leadSheet.columns.map((col) => columnDisplayLabel(col, t))
    const rows = filtered.map((lead) =>
      leadSheet.columns.map((col) => {
        if (col.kind === "custom") return plainCell(lead.customFields?.[col.customField.fieldKey])
        switch (col.builtinKey) {
          case "date":
            return formatLeadDateTime(lead.date, lead.time)
          case "wonDate":
            return lead.status === "won" && lead.wonDate ? lead.wonDate : ""
          case "status":
            return t(leadStatusLabelKey(lead.status))
          case "segment":
            return lead.segment ? t(leadSegmentLabelKey(lead.segment)) : ""
          case "serviceIds":
            return formatLeadServices(lead, enabledServices)
          case "salesPrice":
            return lead.salesPrice == null ? "" : String(lead.salesPrice)
          case "profit":
            return lead.profit == null ? "" : String(lead.profit)
          case "ltv":
            return lead.ltv == null ? "" : String(lead.ltv)
          default:
            return String(lead[col.builtinKey] ?? "")
        }
      })
    )
    downloadCsv("leads.csv", toCsv(headers, rows))
  }

  const pageHeader = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-medium tracking-tight sm:text-2xl">{t("leadSheetPageTitle")}</h1>
        {error === "leadsLoadError" ? (
          <LoadErrorNotice
            className="mt-2"
            message={t(error)}
            onRetry={() => void reload()}
          />
        ) : error ? (
          <p className="mt-1 text-sm text-amber-700">{t(error)}</p>
        ) : null}
      </div>
      <AddLeadDialog
        columns={leadSheet.columns}
        existingLeads={leads}
        onCreate={(lead) => createLead(lead)}
        trigger={
          <Button size="sm" className="shrink-0">
            <PlusIcon />
            {t("leadSheetAddLead")}
          </Button>
        }
      />
    </header>
  )

  return (
    <AdminClientRouteGate>
    <ClientCorePageShell header={pageHeader} bodyClassName="gap-6">
      {loading ? (
        <ClientBoardLoadingState variant="leads" />
      ) : (
        <ClientBoardEnter
          className="client-core-settle-stack flex min-h-0 flex-1 flex-col gap-6"
          pending={pending}
          animateEnter={animateBoardEnter}
        >
      {!sheetFocusOpen ? <LeadPipelineBar stats={pipelineStats} /> : null}

      <LeadSheetFocusShell open={sheetFocusOpen} onClose={() => setSheetFocusOpen(false)}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5 sm:px-6">
            <h2 className="text-base font-medium text-foreground">{t("leadSheetPageTitle")}</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("leadSheetFocusExit")}
              title={t("leadSheetFocusExit")}
              onClick={() => setSheetFocusOpen(false)}
            >
              <XIcon />
            </Button>
          </div>
          <LeadSheetFilterBar
            preset={view.preset}
            range={view.range}
            onPresetChange={onPresetChange}
            onCustomRange={onSheetCustomRange}
            statusCounts={statusCounts}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sheetService={sheetService}
            onSheetServiceChange={setSheetService}
            sheetSegment={sheetSegment}
            onSheetSegmentChange={setSheetSegment}
            sheetFunnel={sheetFunnel}
            onSheetFunnelChange={setSheetFunnel}
            enabledServices={enabledServices}
            servicesLoaded={servicesLoaded}
            search={search}
            onSearchChange={setSearch}
            dateIsAllTime={dateIsAllTime}
            earliestLeadDate={leadDateSpan.earliest}
            latestLeadDate={leadDateSpan.latest}
            onResetDate={resetDate}
            onExport={exportFiltered}
          />
          <LeadSheetScrollArea
            className="min-h-0 flex-1"
            toolbarLeading={sheetToolbarLeading}
            toolbarStart={
              <>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {t("leadSheetRowCount", {
                    shown: String(filtered.length),
                    total: String(leads.length),
                  })}
                </span>
                <SaveStatusBadge status={saveStatus} />
                {canBulkDeleteLeads && bulkSelectMode ? (
                  <LeadSheetBulkSelectionBar
                    selectedCount={selectedLeadIds.size}
                    bulkDeleteOpen={bulkDeleteOpen}
                    onBulkDeleteOpenChange={setBulkDeleteOpen}
                    onExitMode={exitBulkSelectMode}
                    onBulkDelete={handleBulkDelete}
                  />
                ) : null}
              </>
            }
            toolbarEnd={sheetViewToolbar}
          >
            <LeadsTable
              columns={columnLayout.visibleColumns}
              canDelete={mayDeleteLeads}
              leads={filtered}
              sheetSort={sheetSort}
              onSheetSort={handleSheetSort}
              emptyText={leadsEmptyText}
              onUpdate={updateLead}
              onEdit={setEditingId}
              onDelete={(id) => {
                void deleteLead(id)
              }}
              columnLayout={columnLayout}
              detailColumns={leadSheet.columns}
              bulkSelection={bulkSelectionForTable}
            />
          </LeadSheetScrollArea>
        </div>
      </LeadSheetFocusShell>

      <section
        className={cn(
          "dashboard-card flex max-h-[calc(100dvh-7rem)] min-h-[24rem] flex-col overflow-hidden",
          sheetFocusOpen && "hidden"
        )}
      >
        <LeadSheetFilterBar
          preset={view.preset}
          range={view.range}
          onPresetChange={onPresetChange}
          onCustomRange={onSheetCustomRange}
          statusCounts={statusCounts}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sheetService={sheetService}
          onSheetServiceChange={setSheetService}
          sheetSegment={sheetSegment}
          onSheetSegmentChange={setSheetSegment}
          sheetFunnel={sheetFunnel}
          onSheetFunnelChange={setSheetFunnel}
          enabledServices={enabledServices}
          servicesLoaded={servicesLoaded}
          search={search}
          onSearchChange={setSearch}
          dateIsAllTime={dateIsAllTime}
          earliestLeadDate={leadDateSpan.earliest}
          latestLeadDate={leadDateSpan.latest}
          onResetDate={resetDate}
          onExport={exportFiltered}
          focusOpen={false}
          onToggleFocus={() => setSheetFocusOpen(true)}
        />
        <div className="hidden min-h-0 flex-1 flex-col md:flex">
          <LeadSheetScrollArea
            toolbarLeading={sheetToolbarLeading}
            toolbarStart={
              <>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {t("leadSheetRowCount", {
                    shown: String(filtered.length),
                    total: String(leads.length),
                  })}
                </span>
                <SaveStatusBadge status={saveStatus} />
                {canBulkDeleteLeads && bulkSelectMode ? (
                  <LeadSheetBulkSelectionBar
                    selectedCount={selectedLeadIds.size}
                    bulkDeleteOpen={bulkDeleteOpen}
                    onBulkDeleteOpenChange={setBulkDeleteOpen}
                    onExitMode={exitBulkSelectMode}
                    onBulkDelete={handleBulkDelete}
                  />
                ) : null}
              </>
            }
            toolbarEnd={sheetViewToolbar}
          >
            <LeadsTable
              columns={columnLayout.visibleColumns}
              canDelete={mayDeleteLeads}
              leads={filtered}
              sheetSort={sheetSort}
              onSheetSort={handleSheetSort}
              emptyText={leadsEmptyText}
              onUpdate={updateLead}
              onEdit={setEditingId}
              onDelete={(id) => {
                void deleteLead(id)
              }}
              columnLayout={columnLayout}
              detailColumns={leadSheet.columns}
              bulkSelection={bulkSelectionForTable}
            />
          </LeadSheetScrollArea>
          <LeadPipelineFooter stats={pipelineStats} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {t("leadSheetRowCount", {
                shown: String(filtered.length),
                total: String(leads.length),
              })}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <LeadCardList
              leads={filtered}
              emptyText={leadsEmptyText}
              onEdit={setEditingId}
            />
          </div>
        </div>
      </section>
      {editingLead ? (
        <EditLeadDialog
          key={editingLead.id}
          columns={leadSheet.columns}
          existingLeads={leads}
          lead={editingLead}
          onSave={(patch) => saveLead(editingLead.id, patch)}
          onClose={() => setEditingId(null)}
        />
      ) : null}
        </ClientBoardEnter>
      )}
    </ClientCorePageShell>
    </AdminClientRouteGate>
  )
}
