"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { XIcon } from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { CustomersBoardSkeleton } from "@/components/client/ClientBoardSkeletons"
import { CustomersSheetFilterBar } from "@/components/customers/CustomersSheetFilterBar"
import { EditLeadDialog } from "@/components/leads/AddLeadDialog"
import { LeadCardList } from "@/components/leads/LeadCardList"
import { LeadSheetFocusShell } from "@/components/leads/LeadSheetFocusShell"
import { LeadsTable } from "@/components/leads/LeadsBoard"
import { LeadSheetScrollArea } from "@/components/leads/LeadSheetScrollArea"
import { SaveStatusBadge } from "@/components/leads/SaveStatusBadge"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useDashboardViewState } from "@/hooks/useDashboardViewState"
import { useCustomers } from "@/hooks/useCustomers"
import { useLeads } from "@/hooks/useLeads"
import {
  filterDashboardCustomers,
  sumCustomerValue,
  type Customer,
  type CustomerSourceId,
} from "@/lib/customers"
import type { MessageKey } from "@/lib/i18n"
import { formatLeadServices, type Lead, type LeadPlatformId } from "@/lib/leads"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import { leadSegmentLabelKey, leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import { downloadCsv, plainCell, toCsv } from "@/lib/leads/export-csv"
import { formatLeadDateTime } from "@/lib/leads/lead-datetime"
import { matchesSearch } from "@/lib/leads/search"
import {
  findDefaultDateColumnId,
  sortLeadsWithSheetState,
  type SheetSortDirection,
  type SheetSortState,
} from "@/lib/leads/sheet-sort"
import { formatCurrencyDKK } from "@/lib/performance/format"
import type { DateRange } from "@/lib/performance/types"
import type { LeadSegmentId } from "@/lib/leads"
import { cn } from "cn"

function sourceToPlatform(source: CustomerSourceId): LeadPlatformId | "" {
  if (source === "facebook" || source === "instagram") return "meta"
  if (source === "website" || source === "landing") return source
  return ""
}

/** Prefer the live lead so the customer sheet edits the same record as the lead sheet. */
function leadForCustomer(customer: Customer, leadsById: Map<string, Lead>): Lead {
  const existing = leadsById.get(customer.leadId)
  if (existing) return existing
  return {
    id: customer.leadId || customer.id,
    date: customer.closedDate,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    segment: customer.segment,
    companyName: customer.companyName,
    address: customer.address,
    zipCode: customer.zipCode,
    city: customer.city,
    serviceIds: customer.serviceIds,
    platform: sourceToPlatform(customer.source),
    metaAdId: "",
    status: "won",
    salesPrice: customer.salesPrice,
    profit: customer.profit,
    customFields: customer.customFields,
  }
}

const SOURCE_LABEL_KEYS: Record<CustomerSourceId, MessageKey> = {
  facebook: "customersSourceFacebook",
  instagram: "customersSourceInstagram",
  website: "customersSourceWebsite",
  landing: "customersSourceLanding",
  referral: "customersSourceReferral",
  repeat: "customersSourceRepeat",
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}


export function CustomersBoard() {
  const { t } = useLanguage()
  const { enabledServices, loaded: servicesLoaded } = useCompanyServices()
  const searchParams = useSearchParams()
  const { view, pending, onPresetChange, onCustomRange: onCustomRangeRaw } =
    useDashboardViewState("/kunder")
  const dateIsAllTime =
    view.preset === "all_time" || (!searchParams.has("preset") && !searchParams.has("from"))
  const resetDate = useCallback(() => onPresetChange("all_time"), [onPresetChange])
  const onSheetCustomRange = useCallback(
    (range: DateRange) => onCustomRangeRaw(range, "current"),
    [onCustomRangeRaw]
  )
  const { customers, organizationName, loading, error, reload } = useCustomers()
  // Customers mirror won leads; the lead record is what the edit popup changes.
  const { leads, leadSheet, saveLead, saveStatus, updateLead, deleteLead } = useLeads()
  const [sheetSegment, setSheetSegment] = useState<LeadSegmentId | "all">(view.segment ?? "all")
  const [sheetService, setSheetService] = useState<string | null>(view.service)
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceId | "all">("all")
  const [sheetSort, setSheetSort] = useState<SheetSortState>(null)
  const [search, setSearch] = useState("")
  const [sheetFocusOpen, setSheetFocusOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const customerDateSpan = useMemo(() => {
    let earliest: string | null = null
    let latest: string | null = null
    for (const customer of customers) {
      if (!customer.closedDate) continue
      if (!earliest || customer.closedDate < earliest) earliest = customer.closedDate
      if (!latest || customer.closedDate > latest) latest = customer.closedDate
    }
    return { earliest, latest }
  }, [customers])

  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])
  const editingLead = editingLeadId ? (leadsById.get(editingLeadId) ?? null) : null

  const inFilters = useMemo(
    () =>
      filterDashboardCustomers(customers, {
        range: view.range,
        ignoreDate: dateIsAllTime,
        service: sheetService,
        segment: sheetSegment === "all" ? null : sheetSegment,
      }).filter((customer) => sourceFilter === "all" || customer.source === sourceFilter),
    [customers, dateIsAllTime, sheetSegment, sheetService, sourceFilter, view.range]
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
    return searched
  }, [inFilters, search])

  const shownLeads = useMemo(() => {
    const rows = filtered.map((customer) => leadForCustomer(customer, leadsById))
    return sortLeadsWithSheetState(rows, leadSheet.columns, sheetSort, enabledServices)
  }, [enabledServices, filtered, leadSheet.columns, leadsById, sheetSort])

  const handleSheetSort = useCallback((columnId: string, direction: SheetSortDirection | null) => {
    setSheetSort(direction ? { columnId, direction } : null)
  }, [])

  const defaultSortApplied = useRef(false)
  useEffect(() => {
    if (defaultSortApplied.current || leadSheet.columns.length === 0) return
    defaultSortApplied.current = true
    const dateId = findDefaultDateColumnId(leadSheet.columns)
    if (dateId) setSheetSort({ columnId: dateId, direction: "desc" })
  }, [leadSheet.columns])

  const totals = useMemo(() => sumCustomerValue(filtered), [filtered])

  function exportFiltered() {
    const headers = leadSheet.columns.map((col) => columnDisplayLabel(col, t))
    const rows = shownLeads.map((lead) =>
      leadSheet.columns.map((col) => {
        if (col.kind === "custom") return plainCell(lead.customFields?.[col.customField.fieldKey])
        switch (col.builtinKey) {
          case "date":
            return formatLeadDateTime(lead.date, lead.time)
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
          default:
            return String(lead[col.builtinKey] ?? "")
        }
      })
    )
    downloadCsv("customers.csv", toCsv(headers, rows))
  }

  return (
    <AdminClientRouteGate>
      <div className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-4">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-medium tracking-tight sm:text-2xl">{t("customersTitle")}</h1>
            {organizationName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("customersSubtitleOrg", { name: organizationName })}
              </p>
            ) : null}
            {error === "customersLoadError" ? (
              <LoadErrorNotice
                className="mt-2"
                message={t(error)}
                onRetry={() => void reload()}
              />
            ) : error ? (
              <p className="mt-1 text-sm text-amber-700">{t(error)}</p>
            ) : null}
          </div>
        </header>

        {loading ? (
          <CustomersBoardSkeleton />
        ) : (
          <ClientBoardEnter className="flex flex-col gap-4" pending={pending}>
            {!sheetFocusOpen ? (
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
            ) : null}

            <LeadSheetFocusShell open={sheetFocusOpen} onClose={() => setSheetFocusOpen(false)}>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5 sm:px-6">
                  <h2 className="text-base font-medium text-foreground">{t("customersTitle")}</h2>
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
                <CustomersSheetFilterBar
                  preset={view.preset}
                  range={view.range}
                  dateIsAllTime={dateIsAllTime}
                  earliestLeadDate={customerDateSpan.earliest}
                  latestLeadDate={customerDateSpan.latest}
                  onPresetChange={onPresetChange}
                  onCustomRange={onSheetCustomRange}
                  onResetDate={resetDate}
                  sheetSegment={sheetSegment}
                  onSheetSegmentChange={setSheetSegment}
                  sheetService={sheetService}
                  onSheetServiceChange={setSheetService}
                  sourceFilter={sourceFilter}
                  onSourceFilterChange={setSourceFilter}
                  sourceLabelKeys={SOURCE_LABEL_KEYS}
                  enabledServices={enabledServices}
                  servicesLoaded={servicesLoaded}
                  search={search}
                  onSearchChange={setSearch}
                  onExport={exportFiltered}
                />
                <LeadSheetScrollArea
                  className="min-h-0 flex-1"
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
                  <LeadsTable
                    columns={leadSheet.columns}
                    leads={shownLeads}
                    sheetSort={sheetSort}
                    onSheetSort={handleSheetSort}
                    emptyText={t("customersEmpty")}
                    onUpdate={updateLead}
                    onEdit={setEditingLeadId}
                    onDelete={(id) => {
                      void deleteLead(id)
                    }}
                    separatePinnedColumns
                  />
                </LeadSheetScrollArea>
              </div>
            </LeadSheetFocusShell>

            <section
              className={cn(
                "dashboard-card flex h-[calc(100dvh-7rem)] min-h-[24rem] flex-none flex-col overflow-hidden",
                sheetFocusOpen && "hidden"
              )}
            >
              <CustomersSheetFilterBar
                preset={view.preset}
                range={view.range}
                dateIsAllTime={dateIsAllTime}
                earliestLeadDate={customerDateSpan.earliest}
                latestLeadDate={customerDateSpan.latest}
                onPresetChange={onPresetChange}
                onCustomRange={onSheetCustomRange}
                onResetDate={resetDate}
                sheetSegment={sheetSegment}
                onSheetSegmentChange={setSheetSegment}
                sheetService={sheetService}
                onSheetServiceChange={setSheetService}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                sourceLabelKeys={SOURCE_LABEL_KEYS}
                enabledServices={enabledServices}
                servicesLoaded={servicesLoaded}
                search={search}
                onSearchChange={setSearch}
                onExport={exportFiltered}
                onToggleFocus={() => setSheetFocusOpen(true)}
              />
              <div className="hidden min-h-0 flex-1 flex-col md:flex">
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
                <LeadsTable
                  columns={leadSheet.columns}
                  leads={shownLeads}
                  sheetSort={sheetSort}
                  onSheetSort={handleSheetSort}
                  emptyText={t("customersEmpty")}
                  onUpdate={updateLead}
                  onEdit={setEditingLeadId}
                  onDelete={(id) => {
                    void deleteLead(id)
                  }}
                  separatePinnedColumns
                />
              </LeadSheetScrollArea>
              </div>
              <div className="flex min-h-0 flex-1 flex-col md:hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {t("customersRowCount", {
                      shown: String(filtered.length),
                      total: String(customers.length),
                    })}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <LeadCardList
                    leads={shownLeads}
                    emptyText={t("customersEmpty")}
                    onEdit={setEditingLeadId}
                  />
                </div>
              </div>
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

