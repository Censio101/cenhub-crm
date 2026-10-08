"use client"

import { useMemo, useState } from "react"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { LeadsBoardSkeleton } from "@/components/client/ClientBoardSkeletons"
import { LeadDateTimeCell } from "@/components/leads/LeadDateTimeCell"
import { AddLeadDialog, EditLeadDialog } from "@/components/leads/AddLeadDialog"
import { LeadImageFieldCell } from "@/components/leads/LeadImageFieldCell"
import { LeadSheetNoteCell } from "@/components/leads/LeadSheetNoteCell"
import { LeadSheetScrollArea } from "@/components/leads/LeadSheetScrollArea"
import { SaveStatusBadge } from "@/components/leads/SaveStatusBadge"
import { SheetSearchField } from "@/components/leads/SheetSearchField"
import { useLeadSelectOptions } from "@/components/leads/useLeadSelectOptions"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
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
import { isLeadFieldLocked } from "@/lib/db/lead-mapper"
import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import { isServiceId, resolveServiceLabel } from "@/lib/performance/services"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import { leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import {
  LEAD_STATUSES,
  computeLeadPipelineStats,
  filterDashboardLeads,
  formatLeadServices,
  getLeadServiceIds,
  getLeadStatusCellClass,
  getLeadStatusClass,
  getWonLeadCellClass,
  getWonLeadRowClass,
  isLeadSegmentId,
  isLeadStatusId,
  sortLeadsByDate,
  type Lead,
  type LeadPipelineStats,
  type LeadStatusId,
} from "@/lib/leads"
import { matchesSearch } from "@/lib/leads/search"
import { cn } from "cn"

const cellInputClass =
  "h-8 w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-white focus:ring-1 focus:ring-ring select-text"

const leadHeaderCellClass =
  "sticky top-0 z-[2] h-11 border-b border-r border-white/15 bg-[#3f3a36] px-3 text-xs font-medium text-white"

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full min-w-[10.5rem] items-center justify-between gap-1 rounded-md border-0 bg-transparent px-1.5 text-left text-sm outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn("truncate", !display && "text-muted-foreground")}>
          {display ?? placeholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" alignOffset={0} className="z-[80] w-56 gap-0 p-0">
        <PopoverHeader className="border-b border-border px-3 py-2.5">
          <PopoverTitle className="text-sm font-semibold">{label}</PopoverTitle>
          <PopoverDescription className="text-xs">{t("leadSheetSelectPopupHint")}</PopoverDescription>
        </PopoverHeader>
        <ul className="max-h-56 overflow-y-auto p-1" role="listbox" aria-label={label}>
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
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
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
    <Popover>
      <PopoverTrigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full min-w-[10.5rem] items-center justify-between gap-1 rounded-md border-0 bg-transparent px-1.5 text-left text-sm outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn("truncate", !summary && "text-muted-foreground")}>
          {summary || "Service"}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" alignOffset={0} className="z-[80] w-56 gap-0.5 p-1">
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
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

function LeadsTable({
  columns,
  leads,
  emptyText,
  dateSort,
  onToggleDateSort,
  onUpdate,
  onEdit,
  onDelete,
}: {
  columns: LeadSheetTemplateColumn[]
  leads: Lead[]
  emptyText: string
  dateSort: "asc" | "desc"
  onToggleDateSort: () => void
  onUpdate: (id: string, patch: Partial<Lead>) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLanguage()
  const { statuses, segments } = useLeadSelectOptions()
  const colSpan = columns.length + 1

  function headerLabel(col: LeadSheetTemplateColumn) {
    return columnDisplayLabel(col, t)
  }

  function renderColumnCell(lead: Lead, col: LeadSheetTemplateColumn, colIndex: number) {
    const lockedInputClass = (field: Parameters<typeof isLeadFieldLocked>[1]) =>
      cn(cellInputClass, isLeadFieldLocked(lead, field) && "cursor-not-allowed opacity-60")

    // Sticky first two columns follow template order (not always date + name).
    const stickyFirst =
      colIndex === 0
        ? "sticky left-0 z-[1] w-36 min-w-36 px-2"
        : colIndex === 1
          ? "sticky left-36 z-[1] min-w-44 border-r border-border px-2"
          : "px-2"

    const stickyBg = cn(
      stickyFirst,
      getWonLeadCellClass(lead.status) || (colIndex <= 1 ? "bg-card" : "")
    )

    if (col.kind === "custom") {
      const key = col.customField.fieldKey
      const value = lead.customFields?.[key]
      const patchCustom = (next: unknown) =>
        onUpdate(lead.id, { customFields: { ...lead.customFields, [key]: next } })

      if (col.customField.fieldType === "image") {
        return (
          <TableCell key={col.id} className="min-w-40 px-2">
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
          <TableCell key={col.id} className="min-w-44 max-w-[15rem] px-2 py-1.5">
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
          <TableCell key={col.id} className="min-w-28 px-2">
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
          <TableCell key={col.id} className="px-1">
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
        <TableCell key={col.id} className="min-w-36 px-2">
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
          <TableCell key={col.id} className={stickyBg}>
            <LeadDateTimeCell
              date={lead.date}
              time={lead.time}
              ariaLabel={t("leadSheetColDate")}
              disabled={isLeadFieldLocked(lead, "date")}
              className={cn(lockedInputClass("date"), "min-w-[9.5rem]")}
              onCommit={({ date, time }) => onUpdate(lead.id, { date, time })}
            />
          </TableCell>
        )
      case "fullName":
        return (
          <TableCell key={col.id} className={stickyBg}>
            <div className="flex items-center gap-1.5">
              <input
                value={lead.fullName}
                aria-label={t("leadSheetColFullName")}
                disabled={isLeadFieldLocked(lead, "fullName")}
                className={lockedInputClass("fullName")}
                onChange={(event) => onUpdate(lead.id, { fullName: event.target.value })}
              />
              {lead.source === "meta" ? (
                <span className="shrink-0 rounded-full bg-[#1877F2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1877F2]">
                  Meta
                </span>
              ) : null}
            </div>
          </TableCell>
        )
      case "email":
        return (
          <TableCell key={col.id} className="min-w-52 px-2">
            <input
              type="email"
              value={lead.email}
              disabled={isLeadFieldLocked(lead, "email")}
              className={lockedInputClass("email")}
              onChange={(event) => onUpdate(lead.id, { email: event.target.value })}
            />
          </TableCell>
        )
      case "phone":
        return (
          <TableCell key={col.id} className="min-w-36 px-2">
            <input
              value={lead.phone}
              disabled={isLeadFieldLocked(lead, "phone")}
              className={lockedInputClass("phone")}
              onChange={(event) => onUpdate(lead.id, { phone: event.target.value })}
            />
          </TableCell>
        )
      case "segment":
        return (
          <TableCell key={col.id} className="px-1">
            <CellSelect
              value={lead.segment}
              label={t("leadSheetColSegment")}
              placeholder={t("leadSheetSelectPlaceholder")}
              className="min-w-24"
              disabled={isLeadFieldLocked(lead, "segment")}
              options={segments}
              onChange={(segment) =>
                onUpdate(lead.id, {
                  segment: isLeadSegmentId(segment) ? segment : "",
                  companyName: segment === "b2c" ? "" : lead.companyName,
                })
              }
            />
          </TableCell>
        )
      case "companyName":
        return (
          <TableCell key={col.id} className="min-w-44 px-2">
            <input
              value={lead.companyName}
              disabled={lead.segment !== "b2b" || isLeadFieldLocked(lead, "companyName")}
              className={cn(
                lockedInputClass("companyName"),
                lead.segment !== "b2b" && "text-muted-foreground"
              )}
              onChange={(event) => onUpdate(lead.id, { companyName: event.target.value })}
            />
          </TableCell>
        )
      case "address":
        return (
          <TableCell key={col.id} className="min-w-44 px-2">
            <input
              value={lead.address}
              disabled={isLeadFieldLocked(lead, "address")}
              className={lockedInputClass("address")}
              onChange={(event) => onUpdate(lead.id, { address: event.target.value })}
            />
          </TableCell>
        )
      case "zipCode":
        return (
          <TableCell key={col.id} className="min-w-24 px-2">
            <input
              value={lead.zipCode}
              disabled={isLeadFieldLocked(lead, "zipCode")}
              className={lockedInputClass("zipCode")}
              onChange={(event) => onUpdate(lead.id, { zipCode: event.target.value })}
            />
          </TableCell>
        )
      case "city":
        return (
          <TableCell key={col.id} className="min-w-32 px-2">
            <input
              value={lead.city}
              disabled={isLeadFieldLocked(lead, "city")}
              className={lockedInputClass("city")}
              onChange={(event) => onUpdate(lead.id, { city: event.target.value })}
            />
          </TableCell>
        )
      case "serviceIds":
        return (
          <TableCell key={col.id} className="px-1">
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
          <TableCell key={col.id} className="min-w-48 px-2">
            <input
              value={lead.metaAdId}
              disabled={isLeadFieldLocked(lead, "metaAdId")}
              className={cn(lockedInputClass("metaAdId"), "font-mono text-[0.8125rem]")}
              onChange={(event) => onUpdate(lead.id, { metaAdId: event.target.value.trim() })}
            />
          </TableCell>
        )
      case "status":
        return (
          <TableCell
            key={col.id}
            data-lead-status-cell=""
            className={cn("min-w-[13.5rem] p-0", getLeadStatusCellClass(lead.status))}
          >
            <div className="flex h-12 items-stretch">
              <CellSelect
                value={lead.status}
                label={t("leadSheetColStatus")}
                placeholder={t("leadSheetColStatus")}
                options={statuses}
                className="h-full min-h-0 w-full rounded-none border-0 bg-transparent px-3 text-[0.9375rem] font-semibold text-current shadow-none hover:bg-transparent focus:bg-transparent focus-visible:border-transparent focus-visible:ring-0 data-[size=sm]:h-full data-[size=sm]:rounded-none dark:bg-transparent dark:hover:bg-transparent [&_svg]:hidden"
                optionClassName={getLeadStatusClass}
                onChange={(status) =>
                  onUpdate(lead.id, {
                    status: isLeadStatusId(status) ? status : lead.status,
                  })
                }
              />
            </div>
          </TableCell>
        )
      case "salesPrice":
        return (
          <TableCell key={col.id} className="min-w-32 px-2">
            <CurrencyInput
              value={lead.salesPrice}
              label={t("leadSheetColSalesPrice")}
              onChange={(salesPrice) => onUpdate(lead.id, { salesPrice })}
            />
          </TableCell>
        )
      case "profit":
        return (
          <TableCell key={col.id} className="min-w-32 px-2">
            <CurrencyInput
              value={lead.profit}
              label={t("leadSheetColProfit")}
              emphasizePositive
              onChange={(profit) => onUpdate(lead.id, { profit })}
            />
          </TableCell>
        )
      default:
        return null
    }
  }

  return (
    <Table
      containerClassName="overflow-visible"
      className="min-w-[96rem] border-separate border-spacing-0"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col, index) => {
            const label = headerLabel(col)
            const isDateCol = col.kind === "builtin" && col.builtinKey === "date"
            return (
              <TableHead
                key={col.id}
                className={cn(
                  leadHeaderCellClass,
                  index === 0 && "sticky left-0 z-[3] w-36 min-w-36",
                  index === 1 && "sticky left-36 z-[3] min-w-44"
                )}
              >
                {isDateCol ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-white hover:text-white/80"
                    aria-label={
                      dateSort === "desc" ? t("leadSheetSortOldest") : t("leadSheetSortNewest")
                    }
                    onClick={onToggleDateSort}
                  >
                    {label}
                    {dateSort === "desc" ? (
                      <ArrowDownIcon className="size-3.5" />
                    ) : (
                      <ArrowUpIcon className="size-3.5" />
                    )}
                  </button>
                ) : (
                  label
                )}
              </TableHead>
            )
          })}
          <TableHead
            className={cn(
              leadHeaderCellClass,
              "sticky right-0 z-[3] w-[4.75rem] min-w-[4.75rem] border-r-0 border-l px-1 text-center"
            )}
          >
            <span className="sr-only">{t("leadSheetEditLead")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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
            <TableRow key={lead.id} className={getWonLeadRowClass(lead.status)}>
              {columns.map((col, colIndex) => renderColumnCell(lead, col, colIndex))}
              <TableCell
                className={cn(
                  "sticky right-0 z-[1] w-[4.75rem] min-w-[4.75rem] border-l border-border bg-card px-1",
                  getWonLeadCellClass(lead.status)
                )}
              >
                <div className="flex items-center justify-center gap-0.5">
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
                  <DeleteLeadButton
                    leadName={lead.fullName.trim()}
                    onDelete={() => onDelete(lead.id)}
                  />
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
  useCompanyServices()
  const { t } = useLanguage()
  const {
    view,
    pending,
    onPresetChange,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
  } = useDashboardViewState("/leads")
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
    reload,
  } = useLeads()
  const [statusFilter, setStatusFilter] = useState<LeadStatusId | "all">("all")
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingLead = editingId ? (leads.find((lead) => lead.id === editingId) ?? null) : null

  const inFilters = useMemo(
    () =>
      filterDashboardLeads(leads, {
        range: view.range,
        service: view.service,
        funnel: view.funnel,
        segment: view.segment,
      }).filter((lead) => statusFilter === "all" || lead.status === statusFilter),
    [leads, statusFilter, view]
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
    return sortLeadsByDate(searched, dateSort)
  }, [dateSort, inFilters, search])

  const pipelineStats = useMemo(() => computeLeadPipelineStats(filtered), [filtered])

  return (
    <AdminClientRouteGate>
    <div className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-6">
      <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("navLeads")}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {t("leadSheetPageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("leadSheetPageIntro")}</p>
          {error === "leadsLoadError" ? (
            <LoadErrorNotice
              className="mt-2"
              message={t(error)}
              onRetry={() => void reload()}
            />
          ) : error ? (
            <p className="mt-2 text-sm text-amber-700">{t(error)}</p>
          ) : null}
          {dataSource === "supabase" ? (
            <p className="mt-1 text-xs text-muted-foreground">{t("leadSheetSavedInDb")}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:items-end">
          <DateRangeControls
            preset={view.preset}
            range={view.range}
            comparisonEnabled={view.comparisonEnabled}
            comparisonMode={view.comparisonMode}
            comparisonRange={view.comparisonRange}
            onPresetChange={onPresetChange}
            onCustomRange={onCustomRange}
            onComparisonChange={onComparisonChange}
            service={view.service}
            onServiceChange={onServiceChange}
            funnel={view.funnel}
            onFunnelChange={onFunnelChange}
            segment={view.segment}
            onSegmentChange={onSegmentChange}
            showComparison={false}
          />
          <div className="flex flex-wrap items-center justify-end gap-4">
            <SheetSearchField
              value={search}
              onChange={setSearch}
              placeholder={t("leadSheetSearchPlaceholder")}
              ariaLabel={t("leadSheetSearchAria")}
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                if (value === "all" || (typeof value === "string" && isLeadStatusId(value))) {
                  setStatusFilter(value as LeadStatusId | "all")
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  "dashboard-chip min-w-52 px-4",
                  statusFilter !== "all" && getLeadStatusClass(statusFilter)
                )}
                aria-label={t("leadSheetFilterStatusAria")}
              >
                <SelectValue>
                  {statusFilter === "all"
                    ? t("leadSheetFilterAllStatuses")
                    : t(leadStatusLabelKey(statusFilter))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="end"
                alignItemWithTrigger={false}
                className="dashboard-filter-menu lead-status-filter-menu"
              >
                <SelectItem
                  value="all"
                  className="hover:bg-[#3f3a36] hover:text-white hover:**:text-white focus:bg-[#3f3a36] focus:text-white focus:**:text-white data-highlighted:bg-[#3f3a36] data-highlighted:text-white data-highlighted:**:text-white"
                >
                  {t("leadSheetFilterAllStatuses")}
                </SelectItem>
                {LEAD_STATUSES.map((item) => (
                  <SelectItem key={item.id} value={item.id} className={getLeadStatusClass(item.id)}>
                    {t(leadStatusLabelKey(item.id))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddLeadDialog
              columns={leadSheet.columns}
              onCreate={(lead) => createLead(lead)}
              trigger={
                <Button>
                  <PlusIcon />
                  {t("leadSheetAddLead")}
                </Button>
              }
            />
          </div>
        </div>
      </header>

      {loading ? (
        <LeadsBoardSkeleton />
      ) : (
        <ClientBoardEnter className="flex flex-col gap-6" pending={pending}>
      <LeadPipelineBar stats={pipelineStats} />

      <section className="dashboard-card flex h-[calc(100dvh-7rem)] min-h-[24rem] flex-none flex-col overflow-hidden">
        <LeadSheetScrollArea
          toolbarStart={
            <>
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {t("leadSheetRowCount", {
                  shown: String(filtered.length),
                  total: String(leads.length),
                })}
              </span>
              <SaveStatusBadge status={saveStatus} />
            </>
          }
        >
          <LeadsTable
            columns={leadSheet.columns}
            leads={filtered}
            dateSort={dateSort}
            onToggleDateSort={() => setDateSort((current) => (current === "desc" ? "asc" : "desc"))}
            emptyText={t("leadSheetEmptyFiltered")}
            onUpdate={updateLead}
            onEdit={setEditingId}
            onDelete={(id) => {
              void deleteLead(id)
            }}
          />
        </LeadSheetScrollArea>
        <LeadPipelineFooter stats={pipelineStats} />
      </section>
      {editingLead ? (
        <EditLeadDialog
          key={editingLead.id}
          columns={leadSheet.columns}
          lead={editingLead}
          onSave={(patch) => saveLead(editingLead.id, patch)}
          onClose={() => setEditingId(null)}
        />
      ) : null}
        </ClientBoardEnter>
      )}
    </div>
    </AdminClientRouteGate>
  )
}
