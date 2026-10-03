"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  WrenchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  useAccountSettings,
  useCompanyServices,
} from "@/components/account/AccountSettingsProvider"
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
import { formatCurrencyDKK, formatPercentage } from "@/lib/performance/format"
import { SERVICES, isServiceId } from "@/lib/performance/services"
import {
  LEAD_CHANNELS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  MOCK_LEADS,
  syntheticDanishPhone,
  computeLeadPipelineStats,
  emptyLead,
  formatLeadMonth,
  formatLeadServices,
  getLeadServiceIds,
  getLeadStatusCellClass,
  getLeadStatusClass,
  isLeadChannelId,
  isLeadSegmentId,
  isLeadSourceId,
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
  onChange,
}: {
  value: number | null
  label: string
  emphasizePositive?: boolean
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
      className={cn(
        cellInputClass,
        "text-right tabular-nums",
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
  compact = false,
}: {
  value: string[]
  onChange: (value: string[]) => void
  label: string
  compact?: boolean
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
        className={cn(
          "flex h-8 items-center justify-between gap-1 rounded-md border-0 bg-transparent px-1.5 text-left text-sm outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-ring",
          compact ? "w-7 min-w-7 px-0" : "w-full min-w-[10.5rem]"
        )}
      >
        {compact ? null : (
          <span className={cn("truncate", !summary && "text-muted-foreground")}>
            {summary || "Service"}
          </span>
        )}
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

function sourcePillClass(id: string) {
  if (id === "facebook") return "bg-[#1877F2] text-white"
  if (id === "referral") return "bg-[#6d4aff] text-white"
  if (id === "organic") return "bg-[#8a6239] text-white"
  return "bg-muted text-muted-foreground"
}

function formatCreated(date: string) {
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) return date
  return `${Number(day)}.${Number(month)}.${year.slice(2)}`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function LeadListTable({
  leads,
  emptyText,
  dateSort,
  onToggleDateSort,
  onUpdate,
  onDelete,
  onAdd,
}: {
  leads: Lead[]
  emptyText: string
  dateSort: "asc" | "desc"
  onToggleDateSort: () => void
  onUpdate: (id: string, patch: Partial<Lead>) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const columns = 11

  return (
    <Table className="min-w-[72rem] border-separate border-spacing-0">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(leadHeaderCellClass, "min-w-52")}>Navn</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "min-w-36")}>Annoncenavn</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "min-w-40")}>Status</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "w-28")}>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-white hover:text-white/80"
              aria-label={dateSort === "desc" ? "Sortér ældste først" : "Sortér nyeste først"}
              onClick={onToggleDateSort}
            >
              Oprettet
              {dateSort === "desc" ? (
                <ArrowDownIcon className="size-3.5" />
              ) : (
                <ArrowUpIcon className="size-3.5" />
              )}
            </button>
          </TableHead>
          <TableHead className={cn(leadHeaderCellClass, "min-w-32")}>Kilde</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "w-28")}>Platform</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "min-w-48")}>E-mail</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "w-28")}>Ansvarlig</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "min-w-44")}>Service</TableHead>
          <TableHead className={cn(leadHeaderCellClass, "w-16 border-r-0 text-center")}>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-white hover:text-white/80"
              onClick={onAdd}
            >
              <PlusIcon className="size-3.5" />
              Tilføj
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns} className="px-4 py-10 text-center text-sm text-muted-foreground">
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => {
            const open = openId === lead.id
            const services = getLeadServiceIds(lead)
            return (
              <LeadListRows
                key={lead.id}
                lead={lead}
                open={open}
                services={services}
                columns={columns}
                onToggle={() => setOpenId(open ? null : lead.id)}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

function LeadListRows({
  lead,
  open,
  services,
  columns,
  onToggle,
  onUpdate,
  onDelete,
}: {
  lead: Lead
  open: boolean
  services: string[]
  columns: number
  onToggle: () => void
  onUpdate: (id: string, patch: Partial<Lead>) => void
  onDelete: (id: string) => void
}) {
  const { enabledServices } = useCompanyServices()
  const visible = services.slice(0, 2)
  const extra = services.length - visible.length

  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell className="px-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Luk detaljer" : "Åbn detaljer"}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              onClick={onToggle}
            >
              <ChevronRightIcon className={cn("size-4 transition-transform", open && "rotate-90")} />
            </button>
            <input
              value={lead.fullName}
              placeholder="Navn"
              aria-label="Navn"
              className={cellInputClass}
              onChange={(event) => onUpdate(lead.id, { fullName: event.target.value })}
            />
          </div>
        </TableCell>
        <TableCell className="px-2">
          <input
            value={lead.adName}
            placeholder="–"
            aria-label="Annoncenavn"
            className={cellInputClass}
            onChange={(event) => onUpdate(lead.id, { adName: event.target.value })}
          />
        </TableCell>
        <TableCell className="px-2">
          <CellSelect
            value={lead.status}
            label="Status"
            placeholder="Status"
            options={LEAD_STATUSES}
            className={cn(
              "h-7 min-w-0 rounded-md px-2 text-xs font-semibold",
              getLeadStatusCellClass(lead.status)
            )}
            optionClassName={getLeadStatusClass}
            onChange={(status) =>
              onUpdate(lead.id, {
                status: isLeadStatusId(status) ? status : lead.status,
              })
            }
          />
        </TableCell>
        <TableCell className="px-2">
          <input
            type="date"
            value={lead.date}
            aria-label={`Oprettet ${formatCreated(lead.date)}`}
            className={cn(cellInputClass, "w-28 tabular-nums [&::-webkit-calendar-picker-indicator]:opacity-40")}
            onChange={(event) => onUpdate(lead.id, { date: event.target.value })}
          />
        </TableCell>
        <TableCell className="px-2">
          <CellSelect
            value={lead.source}
            label="Kilde"
            placeholder="Kilde"
            options={LEAD_SOURCES}
            className={cn(
              "h-7 min-w-0 rounded-md px-2 text-xs font-semibold",
              sourcePillClass(lead.source)
            )}
            onChange={(source) =>
              onUpdate(lead.id, { source: isLeadSourceId(source) ? source : "" })
            }
          />
        </TableCell>
        <TableCell className="px-2">
          <CellSelect
            value={lead.channel}
            label="Platform"
            placeholder="–"
            options={LEAD_CHANNELS.map((item) => ({ id: item.id, label: item.short }))}
            className="h-7 min-w-16 rounded-md border border-border bg-white px-2 text-xs"
            onChange={(channel) =>
              onUpdate(lead.id, { channel: isLeadChannelId(channel) ? channel : "" })
            }
          />
        </TableCell>
        <TableCell className="px-2">
          <input
            type="email"
            value={lead.email}
            placeholder="mail@…"
            aria-label="E-mail"
            className={cellInputClass}
            onChange={(event) => onUpdate(lead.id, { email: event.target.value })}
          />
        </TableCell>
        <TableCell className="px-2">
          <input
            value={lead.phone}
            placeholder="Telefon"
            aria-label="Telefon"
            className={cn(cellInputClass, "w-32 tabular-nums")}
            onChange={(event) => onUpdate(lead.id, { phone: event.target.value })}
          />
        </TableCell>
        <TableCell className="px-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#3f3a36] text-[0.65rem] font-semibold text-white"
            title={lead.assignee || "Ansvarlig"}
          >
            {initials(lead.assignee) || "–"}
          </span>
        </TableCell>
        <TableCell className="px-2">
          <div className="flex items-center gap-1">
            {visible.map((id) => (
              <span
                key={id}
                className="rounded-md bg-[#e7eef8] px-2 py-0.5 text-xs font-medium text-[#1d4e89]"
              >
                {enabledServices.find((item) => item.id === id)?.label ??
                  SERVICES.find((item) => item.id === id)?.label ??
                  id}
              </span>
            ))}
            {extra > 0 ? (
              <span className="text-xs font-medium text-muted-foreground">+{extra}</span>
            ) : null}
            <ServiceMultiSelect
              value={services}
              label="Service"
              compact
              onChange={(serviceIds) => {
                const first = serviceIds[0]
                onUpdate(lead.id, {
                  serviceIds,
                  service: first && isServiceId(first) ? first : "",
                })
              }}
            />
          </div>
        </TableCell>
        <TableCell className="px-1 text-center">
          <DeleteLeadButton leadName={lead.fullName.trim()} onDelete={() => onDelete(lead.id)} />
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columns} className="bg-[#f3f1ec] px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailField label="Ansvarlig">
                <input
                  value={lead.assignee}
                  aria-label="Ansvarlig"
                  className={cellInputClass}
                  onChange={(event) => onUpdate(lead.id, { assignee: event.target.value })}
                />
              </DetailField>
              <DetailField label="Telefon">
                <CellSelect
                  value={lead.segment}
                  label="Privat/Erhverv"
                  placeholder="Vælg"
                  options={LEAD_SEGMENTS}
                  onChange={(segment) =>
                    onUpdate(lead.id, {
                      segment: isLeadSegmentId(segment) ? segment : "",
                      companyName: segment === "b2c" ? "" : lead.companyName,
                    })
                  }
                />
              </DetailField>
              <DetailField label="Virksomhed">
                <input
                  value={lead.companyName}
                  aria-label="Virksomhed"
                  disabled={lead.segment !== "b2b"}
                  className={cellInputClass}
                  onChange={(event) => onUpdate(lead.id, { companyName: event.target.value })}
                />
              </DetailField>
              <DetailField label="Adresse">
                <input
                  value={lead.address}
                  aria-label="Adresse"
                  className={cellInputClass}
                  onChange={(event) => onUpdate(lead.id, { address: event.target.value })}
                />
              </DetailField>
              <DetailField label="Postnr.">
                <input
                  value={lead.zipCode}
                  aria-label="Postnummer"
                  className={cellInputClass}
                  onChange={(event) => onUpdate(lead.id, { zipCode: event.target.value })}
                />
              </DetailField>
              <DetailField label="By">
                <input
                  value={lead.city}
                  aria-label="By"
                  className={cellInputClass}
                  onChange={(event) => onUpdate(lead.id, { city: event.target.value })}
                />
              </DetailField>
              <DetailField label="Meta kunde annonce ID">
                <input
                  value={lead.metaAdId}
                  aria-label="Meta kunde annonce ID"
                  className={cn(cellInputClass, "font-mono text-[0.8125rem]")}
                  onChange={(event) => onUpdate(lead.id, { metaAdId: event.target.value.trim() })}
                />
              </DetailField>
              <DetailField label="Salgspris">
                <CurrencyInput
                  value={lead.salesPrice}
                  label="Salgspris"
                  onChange={(salesPrice) => onUpdate(lead.id, { salesPrice })}
                />
              </DetailField>
              <DetailField label="Bundlinje">
                <CurrencyInput
                  value={lead.profit}
                  label="Bundlinje"
                  emphasizePositive
                  onChange={(profit) => onUpdate(lead.id, { profit })}
                />
              </DetailField>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

export function LeadsBoard() {
  const { enabledServices } = useCompanyServices()
  const { useDemoData, workspaceReady } = useAccountSettings()
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    if (!workspaceReady) return
    setLeads(
      useDemoData
        ? MOCK_LEADS.map((lead) => ({
            ...lead,
            phone: lead.phone.trim() || syntheticDanishPhone(lead.id),
          }))
        : []
    )
  }, [useDemoData, workspaceReady])
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

  function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
    )
  }

  function deleteLead(id: string) {
    setLeads((current) => current.filter((lead) => lead.id !== id))
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
                  : enabledServices.find((item) => item.id === activeServiceFilter)
                      ?.label}
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
            onClick={() =>
              setLeads((current) => [
                emptyLead(
                  `lead-${Date.now()}`,
                  monthFilter === "all"
                    ? new Date()
                    : new Date(`${monthFilter}-01T00:00:00`)
                ),
                ...current,
              ])
            }
          >
            <PlusIcon />
            Tilføj lead
          </Button>
        </div>
      </header>

      <LeadPipelineBar stats={pipelineStats} />

      <section className="dashboard-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <LeadListTable
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
            onDelete={deleteLead}
            onAdd={() =>
              setLeads((current) => [
                emptyLead(
                  `lead-${Date.now()}`,
                  monthFilter === "all"
                    ? new Date()
                    : new Date(`${monthFilter}-01T00:00:00`)
                ),
                ...current,
              ])
            }
          />
        </div>
        <LeadPipelineFooter stats={pipelineStats} />
      </section>
    </div>
  )
}
