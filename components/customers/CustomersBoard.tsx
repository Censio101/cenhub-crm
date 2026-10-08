"use client"

import { useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, PencilIcon } from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { CustomersBoardSkeleton } from "@/components/client/ClientBoardSkeletons"
import { EditLeadDialog } from "@/components/leads/AddLeadDialog"
import { ImageLinkButton } from "@/components/leads/ImageLinkPreview"
import { LeadSheetNoteCell } from "@/components/leads/LeadSheetNoteCell"
import { LeadSheetScrollArea } from "@/components/leads/LeadSheetScrollArea"
import { SaveStatusBadge } from "@/components/leads/SaveStatusBadge"
import { SheetSearchField } from "@/components/leads/SheetSearchField"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DateRangeControls } from "@/components/performance/DateRangeControls"
import { Button } from "@/components/ui/button"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCustomers } from "@/hooks/useCustomers"
import { useLeads } from "@/hooks/useLeads"
import {
  CUSTOMER_SOURCES,
  filterDashboardCustomers,
  formatCustomerServices,
  sortCustomersByDate,
  sumCustomerValue,
  type Customer,
  type CustomerSourceId,
} from "@/lib/customers"
import type { MessageKey } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"
import { parseImageCellValue } from "@/lib/lead-sheet/image-link"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { matchesSearch } from "@/lib/leads/search"
import { formatCurrencyDKK, formatMonthLabel } from "@/lib/performance/format"
import { cn } from "cn"

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function formatClosedDate(value: string, locale: Locale): string {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return `${Number(day)}. ${formatMonthLabel(date, locale).toLowerCase()}`
}

const SOURCE_LABEL_KEYS: Record<CustomerSourceId, MessageKey> = {
  facebook: "customersSourceFacebook",
  instagram: "customersSourceInstagram",
  website: "customersSourceWebsite",
  landing: "customersSourceLanding",
  referral: "customersSourceReferral",
  repeat: "customersSourceRepeat",
}

const headerCellClass =
  "sticky top-0 z-[2] h-11 border-b border-r border-white/15 bg-[#3f3a36] px-3 text-xs font-medium whitespace-nowrap text-white"

type CustomColumn = Extract<LeadSheetTemplateColumn, { kind: "custom" }>

function CustomFieldValue({ column, value }: { column: CustomColumn; value: unknown }) {
  const type = column.customField.fieldType

  if (type === "image") {
    const parsed = parseImageCellValue(value)
    if (parsed.kind === "link") {
      return <ImageLinkButton url={parsed.url} text={parsed.text} className="max-w-[12rem]" />
    }
    return <span className="text-muted-foreground">–</span>
  }

  if (value == null || value === "") return <span className="text-muted-foreground">–</span>
  if (typeof value === "number") {
    return <span className="tabular-nums">{value.toLocaleString("da-DK")}</span>
  }
  return <span>{String(value)}</span>
}

export function CustomersBoard() {
  const { locale, t } = useLanguage()
  const { enabledServices } = useCompanyServices()
  const {
    view,
    pending,
    onPresetChange,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
  } = useDashboardViewState("/kunder")
  const { customers, organizationName, loading, error, reload } = useCustomers()
  // Customers mirror won leads; the lead record is what the edit popup changes.
  const { leads, leadSheet, saveLead, saveStatus } = useLeads()
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceId | "all">("all")
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc")
  const [search, setSearch] = useState("")
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)

  const customColumns = useMemo(
    () => leadSheet.columns.filter((col): col is CustomColumn => col.kind === "custom"),
    [leadSheet.columns]
  )
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])
  const editingLead = editingLeadId ? (leadsById.get(editingLeadId) ?? null) : null

  const inFilters = useMemo(
    () =>
      filterDashboardCustomers(customers, {
        range: view.range,
        service: view.service,
        segment: view.segment,
      }).filter((customer) => sourceFilter === "all" || customer.source === sourceFilter),
    [customers, sourceFilter, view]
  )

  const filtered = useMemo(() => {
    const searched = search.trim()
      ? inFilters.filter((customer) =>
          matchesSearch(
            [
              customer.fullName,
              customer.email,
              customer.phone,
              customer.companyName,
              customer.city,
              customer.address,
            ],
            search
          )
        )
      : inFilters
    return sortCustomersByDate(searched, dateSort)
  }, [dateSort, inFilters, search])

  const totals = useMemo(() => sumCustomerValue(filtered), [filtered])

  return (
    <AdminClientRouteGate>
      <div className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-6">
        <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
              {t("customersEyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {t("customersTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {organizationName
                ? t("customersSubtitleOrg", { name: organizationName })
                : t("customersSubtitleDefault")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("customersSheetSyncHint")}</p>
            {error === "customersLoadError" ? (
              <LoadErrorNotice
                className="mt-1"
                message={t(error)}
                onRetry={() => void reload()}
              />
            ) : error ? (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                {t(error)}
              </p>
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
                placeholder={t("customersSearchPlaceholder")}
                ariaLabel={t("customersSearchAria")}
              />
              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    setSourceFilter(value === "all" ? "all" : (value as CustomerSourceId))
                  }
                }}
              >
                <SelectTrigger
                  className="dashboard-chip min-w-40 px-4"
                  aria-label={t("customersFilterSourceAria")}
                >
                  <SelectValue>
                    {sourceFilter === "all"
                      ? t("customersAllSources")
                      : t(SOURCE_LABEL_KEYS[sourceFilter])}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className="dashboard-filter-menu"
                >
                  <SelectItem value="all">{t("customersAllSources")}</SelectItem>
                  {CUSTOMER_SOURCES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {t(SOURCE_LABEL_KEYS[item.id])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {loading ? (
          <CustomersBoardSkeleton />
        ) : (
          <ClientBoardEnter className="flex flex-col gap-6" pending={pending}>
            <section aria-label={t("customersOverviewAria")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <OverviewStat
                  label={t("customersStatCustomers")}
                  value={countLabel(
                    totals.count,
                    t("customersCountOne"),
                    t("customersCountMany")
                  )}
                />
                <OverviewStat
                  label={t("customersStatRevenue")}
                  value={formatCurrencyDKK(totals.sales)}
                  tone="success"
                />
                <OverviewStat
                  label={t("customersStatProfit")}
                  value={formatCurrencyDKK(totals.profit)}
                  tone="success"
                />
              </div>
            </section>

            <section className="dashboard-card flex h-[calc(100dvh-7rem)] min-h-[24rem] flex-none flex-col overflow-hidden">
              <LeadSheetScrollArea
                toolbarStart={
                  <>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {t("customersRowCount", {
                        shown: String(filtered.length),
                        total: String(customers.length),
                      })}
                    </span>
                    <SaveStatusBadge status={saveStatus} />
                  </>
                }
              >
                <CustomersTable
                  customers={filtered}
                  customColumns={customColumns}
                  dateSort={dateSort}
                  enabledServices={enabledServices}
                  locale={locale}
                  canEdit={(customer) => leadsById.has(customer.leadId)}
                  onEdit={(customer) => setEditingLeadId(customer.leadId)}
                  onToggleDateSort={() =>
                    setDateSort((current) => (current === "desc" ? "asc" : "desc"))
                  }
                />
              </LeadSheetScrollArea>
            </section>
          </ClientBoardEnter>
        )}

        {editingLead ? (
          <EditLeadDialog
            key={editingLead.id}
            columns={leadSheet.columns}
            lead={editingLead}
            onSave={(patch) => saveLead(editingLead.id, patch)}
            onClose={() => setEditingLeadId(null)}
          />
        ) : null}
      </div>
    </AdminClientRouteGate>
  )
}

function OverviewStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success"
}) {
  return (
    <div className="dashboard-card px-5 py-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-[1.65rem] leading-none font-semibold tracking-tight tabular-nums",
          tone === "success" ? "text-success-foreground" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function CustomersTable({
  customers,
  customColumns,
  dateSort,
  enabledServices,
  locale,
  canEdit,
  onEdit,
  onToggleDateSort,
}: {
  customers: Customer[]
  customColumns: CustomColumn[]
  dateSort: "asc" | "desc"
  enabledServices: ReturnType<typeof useCompanyServices>["enabledServices"]
  locale: Locale
  canEdit: (customer: Customer) => boolean
  onEdit: (customer: Customer) => void
  onToggleDateSort: () => void
}) {
  const { t } = useLanguage()
  const baseColumns = [
    t("customersColClosed"),
    t("customersColCustomer"),
    t("customersColSegment"),
    t("customersColCompany"),
    t("customersColAddress"),
    t("customersColCity"),
    t("customersColService"),
    t("customersColSource"),
    t("customersColSalesPrice"),
    t("customersColProfit"),
  ]
  const customLabels = customColumns.map((col) => columnDisplayLabel(col, t))
  const columns = [...baseColumns, ...customLabels]
  const colSpan = columns.length + 1

  return (
    <Table
      containerClassName="overflow-visible"
      className="min-w-[76rem] border-separate border-spacing-0"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((label, index) => (
            <TableHead
              key={`${label}-${index}`}
              className={cn(
                headerCellClass,
                index === 0 && "sticky left-0 z-[3] w-40 min-w-40",
                index === 1 && "sticky left-40 z-[3] min-w-48"
              )}
            >
              {index === 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-white hover:text-white/80"
                  aria-label={
                    dateSort === "desc" ? t("customersSortOldest") : t("customersSortNewest")
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
          <TableHead
            className={cn(
              headerCellClass,
              "sticky right-0 z-[3] w-12 min-w-12 border-r-0 border-l px-1 text-center"
            )}
          >
            <span className="sr-only">{t("customersEditCustomer")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={colSpan}
              className="px-4 py-10 text-center text-sm text-muted-foreground"
            >
              {t("customersEmpty")}
            </TableCell>
          </TableRow>
        ) : (
          customers.map((customer) => (
            <TableRow key={customer.id} className="hover:bg-transparent">
              <TableCell className="sticky left-0 z-[1] w-40 min-w-40 bg-card px-3 whitespace-nowrap">
                {formatClosedDate(customer.closedDate, locale)}
              </TableCell>
              <TableCell className="sticky left-40 z-[1] min-w-48 border-r border-border bg-card px-3">
                <div className="min-w-0">
                  <p className="font-medium">{customer.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.email ? (
                      <a
                        href={`mailto:${customer.email}`}
                        className="hover:text-primary hover:underline"
                      >
                        {customer.email}
                      </a>
                    ) : null}
                    {customer.email && customer.phone ? " · " : null}
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}
                        className="hover:text-primary hover:underline"
                      >
                        {customer.phone}
                      </a>
                    ) : null}
                  </p>
                </div>
              </TableCell>
              <TableCell className="px-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    customer.segment === "b2b"
                      ? "bg-[#e8eefb] text-[#1d4ed8]"
                      : "bg-[#f1ece5] text-[#6b5a45]"
                  )}
                >
                  {customer.segment === "b2b" ? t("filterSegmentB2b") : t("filterSegmentB2c")}
                </span>
              </TableCell>
              <TableCell className="min-w-44 px-3">{customer.companyName || "–"}</TableCell>
              <TableCell className="min-w-48 px-3">
                {customer.address}
                {customer.zipCode ? `, ${customer.zipCode}` : ""}
              </TableCell>
              <TableCell className="min-w-32 px-3">{customer.city}</TableCell>
              <TableCell className="min-w-44 px-3">
                {formatCustomerServices(customer, enabledServices)}
              </TableCell>
              <TableCell className="px-3">{t(SOURCE_LABEL_KEYS[customer.source])}</TableCell>
              <TableCell className="px-3 text-right tabular-nums">
                {formatCurrencyDKK(customer.salesPrice)}
              </TableCell>
              <TableCell className="px-3 text-right font-medium tabular-nums text-success-foreground">
                {formatCurrencyDKK(customer.profit)}
              </TableCell>
              {customColumns.map((col) => {
                const value = customer.customFields?.[col.customField.fieldKey]
                if (col.customField.fieldType === "textarea") {
                  return (
                    <TableCell key={col.id} className="min-w-44 max-w-[15rem] px-2 py-1.5">
                      <LeadSheetNoteCell
                        readOnly
                        value={typeof value === "string" ? value : ""}
                        fieldLabel={col.customField.label}
                        leadName={customer.fullName}
                      />
                    </TableCell>
                  )
                }
                return (
                  <TableCell key={col.id} className="min-w-36 px-3 text-sm">
                    <CustomFieldValue column={col} value={value} />
                  </TableCell>
                )
              })}
              <TableCell className="sticky right-0 z-[1] w-12 min-w-12 border-l border-border bg-card px-1">
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canEdit(customer)}
                    aria-label={t("customersEditCustomer")}
                    title={canEdit(customer) ? t("customersEditCustomer") : t("customersLeadMissing")}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => onEdit(customer)}
                  >
                    <PencilIcon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
