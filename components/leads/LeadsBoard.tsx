"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  WrenchIcon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
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
import { SERVICES, isServiceId } from "@/lib/performance/services"
import {
  LEAD_SEGMENTS,
  LEAD_STATUSES,
  computeLeadPipelineStats,
  emptyLead,
  formatLeadMonth,
  formatLeadServices,
  getLeadServiceIds,
  getLeadStatusCellClass,
  getLeadStatusClass,
  getWonLeadCellClass,
  getWonLeadRowClass,
  isLeadSegmentId,
  isLeadStatusId,
  leadMonthKey,
  sortLeadsByDate,
  type Lead,
  type LeadPipelineStats,
  type LeadStatusId,
} from "@/lib/leads"
import { cn } from "cn"

const cellInputClass =
  "h-8 w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-white focus:ring-1 focus:ring-ring"

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
      value={
        focused ? draft : value == null ? "" : formatCurrencyDKK(value)
      }
      placeholder="–"
      aria-label={label}
      disabled={disabled}
      className={cn(
        cellInputClass,
        "text-right tabular-nums",
        disabled && "cursor-not-allowed opacity-60",
        emphasizePositive && value != null && value > 0
          ? "text-success-foreground"
          : ""
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
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="z-[80]"
      >
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={option.id}
            className={optionClassName?.(option.id)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const { enabledServices } = useCompanyServices()
  const options = useMemo(() => {
    const enabledIds = new Set(enabledServices.map((service) => service.id))
    const extras = value
      .filter((id) => !enabledIds.has(id))
      .map((id) => SERVICES.find((service) => service.id === id) ?? { id, label: id })
    return [...enabledServices, ...extras]
  }, [enabledServices, value])
  const summary = formatLeadServices({ serviceIds: value }, enabledServices)

  function toggle(id: string) {
    const next = value.includes(id)
      ? value.filter((item) => item !== id)
      : [...value, id]
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
      <PopoverContent
        align="start"
        alignOffset={0}
        className="z-[80] w-56 gap-0.5 p-1"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Ingen ydelser at vælge. Tilføj en under Indstillinger.
          </p>
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

function DeleteLeadButton({
  leadName,
  onDelete,
}: {
  leadName: string
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Slet lead"
            className="text-muted-foreground hover:text-danger-foreground"
          />
        }
      >
        <Trash2Icon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 bg-[#f7f7f5] p-3">
        <PopoverHeader>
          <PopoverTitle>Slet lead?</PopoverTitle>
          <PopoverDescription>
            {leadName
              ? `${leadName} fjernes fra listen. Det kan ikke fortrydes.`
              : "Leadet fjernes fra listen. Det kan ikke fortrydes."}
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuller
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            Slet
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function LeadPipelineFooter({ stats }: { stats: LeadPipelineStats }) {
  return (
    <div
      aria-live="polite"
      className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-[#f7f7f5] px-4 py-2.5 sm:px-6"
    >
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <FooterStat
          label="Tabt"
          value={formatCurrencyDKK(stats.lostValue)}
          tone="danger"
        />
        <FooterStat
          label="Pipeline"
          value={formatCurrencyDKK(stats.pipelineValue)}
          tone="open"
        />
        <FooterStat
          label="Lukkede"
          value={formatCurrencyDKK(stats.wonValue)}
          tone="success"
        />
        <FooterStat
          label="Lukkerate"
          value={
            stats.closeRate == null ? "–" : formatPercentage(stats.closeRate)
          }
        />
        <FooterStat
          label="Gns. salg"
          value={
            stats.averageWonSales == null
              ? "–"
              : formatCurrencyDKK(stats.averageWonSales)
          }
          tone="success"
        />
        <FooterStat
          label="Gns. bundlinje"
          value={
            stats.averageWonProfit == null
              ? "–"
              : formatCurrencyDKK(stats.averageWonProfit)
          }
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
  leads,
  emptyText,
  dateSort,
  onToggleDateSort,
  onUpdate,
  onDelete,
}: {
  leads: Lead[]
  emptyText: string
  dateSort: "asc" | "desc"
  onToggleDateSort: () => void
  onUpdate: (id: string, patch: Partial<Lead>) => void
  onDelete: (id: string) => void
}) {
  return (
    <Table
      containerClassName="overflow-visible"
      className="min-w-[96rem] border-separate border-spacing-0"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {[
            "Dato",
            "Fulde navn",
            "E-mail",
            "Telefon",
            "Privat/Erhverv",
            "Virksomhed",
            "Adresse",
            "Postnr.",
            "By",
            "Service",
            "Meta kunde annonce ID",
            "Status",
            "Salgspris",
            "Bundlinje",
          ].map((label, index) => (
            <TableHead
              key={label}
              className={cn(
                leadHeaderCellClass,
                index === 0 && "sticky left-0 z-[3] w-36 min-w-36",
                index === 1 && "sticky left-36 z-[3] min-w-44"
              )}
            >
              {index === 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-white hover:text-white/80"
                  aria-label={
                    dateSort === "desc"
                      ? "Sortér ældste først"
                      : "Sortér nyeste først"
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
          ))}
          <TableHead className={cn(leadHeaderCellClass, "sticky right-0 z-[3] w-11 min-w-11 border-r-0 border-l px-1 text-center")}>
            <span className="sr-only">Slet</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={15}
              className="px-4 py-10 text-center text-sm text-muted-foreground"
            >
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => {
            const lockedInputClass = (field: Parameters<typeof isLeadFieldLocked>[1]) =>
              cn(
                cellInputClass,
                isLeadFieldLocked(lead, field) && "cursor-not-allowed opacity-60"
              )

            return (
            <TableRow key={lead.id} className={getWonLeadRowClass(lead.status)}>
              <TableCell
                className={cn(
                  "sticky left-0 z-[1] w-36 min-w-36 px-2",
                  getWonLeadCellClass(lead.status) || "bg-card"
                )}
              >
                <input
                  type="date"
                  value={lead.date}
                  aria-label="Dato"
                  disabled={isLeadFieldLocked(lead, "date")}
                  className={cn(
                    lockedInputClass("date"),
                    "[&::-webkit-calendar-picker-indicator]:opacity-40"
                  )}
                  onChange={(event) =>
                    onUpdate(lead.id, { date: event.target.value })
                  }
                />
              </TableCell>
              <TableCell
                className={cn(
                  "sticky left-36 z-[1] min-w-44 border-r border-border px-2",
                  getWonLeadCellClass(lead.status) || "bg-card"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    value={lead.fullName}
                    placeholder="Navn"
                    aria-label="Fulde navn"
                    disabled={isLeadFieldLocked(lead, "fullName")}
                    className={lockedInputClass("fullName")}
                    onChange={(event) =>
                      onUpdate(lead.id, { fullName: event.target.value })
                    }
                  />
                  {lead.source === "meta" ? (
                    <span className="shrink-0 rounded-full bg-[#1877F2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1877F2]">
                      Meta
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="min-w-52 px-2">
                <input
                  type="email"
                  value={lead.email}
                  placeholder="mail@…"
                  aria-label="E-mail"
                  disabled={isLeadFieldLocked(lead, "email")}
                  className={lockedInputClass("email")}
                  onChange={(event) =>
                    onUpdate(lead.id, { email: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="min-w-36 px-2">
                <input
                  value={lead.phone}
                  placeholder="00 00 00 00"
                  aria-label="Telefon"
                  disabled={isLeadFieldLocked(lead, "phone")}
                  className={lockedInputClass("phone")}
                  onChange={(event) =>
                    onUpdate(lead.id, { phone: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="px-1">
                <CellSelect
                  value={lead.segment}
                  label="Privat/Erhverv"
                  placeholder="Vælg"
                  className="min-w-24"
                  disabled={isLeadFieldLocked(lead, "segment")}
                  options={LEAD_SEGMENTS}
                  onChange={(segment) =>
                    onUpdate(lead.id, {
                      segment: isLeadSegmentId(segment) ? segment : "",
                      companyName: segment === "b2c" ? "" : lead.companyName,
                    })
                  }
                />
              </TableCell>
              <TableCell className="min-w-44 px-2">
                <input
                  value={lead.companyName}
                  placeholder={lead.segment === "b2b" ? "Virksomhed" : "–"}
                  aria-label="Virksomhed"
                  disabled={
                    lead.segment !== "b2b" || isLeadFieldLocked(lead, "companyName")
                  }
                  className={cn(
                    lockedInputClass("companyName"),
                    lead.segment !== "b2b" && "text-muted-foreground"
                  )}
                  onChange={(event) =>
                    onUpdate(lead.id, { companyName: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="min-w-44 px-2">
                <input
                  value={lead.address}
                  placeholder="Adresse"
                  aria-label="Adresse"
                  disabled={isLeadFieldLocked(lead, "address")}
                  className={lockedInputClass("address")}
                  onChange={(event) =>
                    onUpdate(lead.id, { address: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="min-w-24 px-2">
                <input
                  value={lead.zipCode}
                  placeholder="0000"
                  aria-label="Postnummer"
                  disabled={isLeadFieldLocked(lead, "zipCode")}
                  className={lockedInputClass("zipCode")}
                  onChange={(event) =>
                    onUpdate(lead.id, { zipCode: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="min-w-32 px-2">
                <input
                  value={lead.city}
                  placeholder="By"
                  aria-label="By"
                  disabled={isLeadFieldLocked(lead, "city")}
                  className={lockedInputClass("city")}
                  onChange={(event) =>
                    onUpdate(lead.id, { city: event.target.value })
                  }
                />
              </TableCell>
              <TableCell className="px-1">
                <ServiceMultiSelect
                  value={getLeadServiceIds(lead)}
                  label="Service"
                  disabled={false}
                  onChange={(serviceIds) => {
                    const first = serviceIds[0] ?? ""
                    onUpdate(lead.id, {
                      serviceIds,
                      service: isServiceId(first) ? first : "",
                    })
                  }}
                />
              </TableCell>
              <TableCell className="min-w-48 px-2">
                <input
                  value={lead.metaAdId}
                  placeholder="Fx. 1202187654321098"
                  aria-label="Meta kunde annonce ID"
                  inputMode="numeric"
                  spellCheck={false}
                  disabled={isLeadFieldLocked(lead, "metaAdId")}
                  className={cn(
                    lockedInputClass("metaAdId"),
                    "font-mono text-[0.8125rem]"
                  )}
                  onChange={(event) =>
                    onUpdate(lead.id, { metaAdId: event.target.value.trim() })
                  }
                />
              </TableCell>
              <TableCell
                data-lead-status-cell=""
                className={cn(
                  "min-w-[13.5rem] p-0",
                  getLeadStatusCellClass(lead.status)
                )}
              >
                <div className="flex h-12 items-stretch">
                  <CellSelect
                    value={lead.status}
                    label="Status"
                    placeholder="Status"
                    options={LEAD_STATUSES}
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
              <TableCell className="min-w-32 px-2">
                <CurrencyInput
                  value={lead.salesPrice}
                  label="Salgspris"
                  onChange={(salesPrice) => onUpdate(lead.id, { salesPrice })}
                />
              </TableCell>
              <TableCell className="min-w-32 px-2">
                <CurrencyInput
                  value={lead.profit}
                  label="Bundlinje"
                  emphasizePositive
                  onChange={(profit) => onUpdate(lead.id, { profit })}
                />
              </TableCell>
              <TableCell
                className={cn(
                  "sticky right-0 z-[1] w-11 min-w-11 border-l border-border bg-card px-1",
                  getWonLeadCellClass(lead.status)
                )}
              >
                <DeleteLeadButton
                  leadName={lead.fullName.trim()}
                  onDelete={() => onDelete(lead.id)}
                />
              </TableCell>
            </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

export function LeadsBoard() {
  const { enabledServices } = useCompanyServices()
  const {
    leads,
    error,
    needsClientSelection,
    dataSource,
    updateLead,
    createLead,
    deleteLead,
  } = useLeads()
  const [statusFilter, setStatusFilter] = useState<LeadStatusId | "all">("all")
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc")

  const months = useMemo(() => {
    const keys = new Set(leads.map((lead) => leadMonthKey(lead.date)))
    return [...keys].sort((left, right) => right.localeCompare(left))
  }, [leads])

  const activeServiceFilter =
    serviceFilter !== "all" &&
    enabledServices.some((item) => item.id === serviceFilter)
      ? serviceFilter
      : "all"

  const filtered = useMemo(() => {
    const next = leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter
      const matchesService =
        activeServiceFilter === "all" ||
        getLeadServiceIds(lead).includes(activeServiceFilter)
      const matchesMonth =
        monthFilter === "all" || leadMonthKey(lead.date) === monthFilter
      return matchesStatus && matchesService && matchesMonth
    })
    return sortLeadsByDate(next, dateSort)
  }, [activeServiceFilter, dateSort, leads, monthFilter, statusFilter])

  const pipelineStats = useMemo(
    () => computeLeadPipelineStats(filtered),
    [filtered]
  )

  if (needsClientSelection) {
    return <SelectClientEmptyState />
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-6">
      <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Leads
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            Leadliste
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Følg nye henvendelser fra første kontakt til vundet kunde
          </p>
          {error ? (
            <p className="mt-2 text-sm text-amber-700">{error}</p>
          ) : null}
          {dataSource === "supabase" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Gemmes i database
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={monthFilter}
            onValueChange={(value) => {
              if (typeof value === "string") setMonthFilter(value)
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-48 px-4"
              aria-label="Filtrer på måned"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              <SelectValue>
                {monthFilter === "all"
                  ? "Alle måneder"
                  : formatLeadMonth(monthFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Alle måneder</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatLeadMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeServiceFilter}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setServiceFilter(value === "all" ? "all" : value)
              }
            }}
          >
            <SelectTrigger
              className="dashboard-chip min-w-44 px-4"
              aria-label="Filtrer på service"
            >
              <WrenchIcon className="size-4 text-muted-foreground" />
              <SelectValue>
                {activeServiceFilter === "all"
                  ? "Alle services"
                  : (enabledServices.find((item) => item.id === activeServiceFilter)
                      ?.label ?? "Alle services")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="dashboard-filter-menu"
            >
              <SelectItem value="all">Alle services</SelectItem>
              {enabledServices.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (
                value === "all" ||
                (typeof value === "string" && isLeadStatusId(value))
              ) {
                setStatusFilter(value as LeadStatusId | "all")
              }
            }}
          >
            <SelectTrigger
              className={cn(
                "dashboard-chip min-w-52 px-4",
                statusFilter !== "all" && getLeadStatusClass(statusFilter)
              )}
              aria-label="Filtrer på status"
            >
              <SelectValue>
                {statusFilter === "all"
                  ? "Alle statusser"
                  : LEAD_STATUSES.find((item) => item.id === statusFilter)
                      ?.label}
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
                Alle statusser
              </SelectItem>
              {LEAD_STATUSES.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  className={getLeadStatusClass(item.id)}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              void createLead(
                emptyLead(
                  `lead-${Date.now()}`,
                  monthFilter === "all"
                    ? new Date()
                    : new Date(`${monthFilter}-01T00:00:00`)
                )
              )
            }}
          >
            <PlusIcon />
            Tilføj lead
          </Button>
        </div>
      </header>

      <LeadPipelineBar stats={pipelineStats} />

      <section className="dashboard-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <LeadsTable
            leads={filtered}
            dateSort={dateSort}
            onToggleDateSort={() =>
              setDateSort((current) => (current === "desc" ? "asc" : "desc"))
            }
            emptyText={
              monthFilter === "all"
                ? "Ingen leads med den valgte status."
                : "Ingen leads i den valgte måned."
            }
            onUpdate={updateLead}
            onDelete={(id) => {
              void deleteLead(id)
            }}
          />
        </div>
        <LeadPipelineFooter stats={pipelineStats} />
      </section>
    </div>
  )
}
