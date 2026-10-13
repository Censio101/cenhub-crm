"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { XIcon } from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { AdminClientRouteGate } from "@/components/admin/AdminClientRouteGate"
import { ClientBoardEnter } from "@/components/client/ClientBoardEnter"
import { ClientCorePageShell } from "@/components/client/ClientCorePageShell"
import { useClientNavigation } from "@/components/client/ClientNavigationProvider"
import { LoadErrorNotice } from "@/components/client/LoadErrorNotice"
import { ClientBoardLoadingState } from "@/components/client/ClientBoardLoadingState"
import { CustomersSheetFilterBar } from "@/components/customers/CustomersSheetFilterBar"
import { EditLeadDialog } from "@/components/leads/AddLeadDialog"
import { LeadCardList } from "@/components/leads/LeadCardList"
import { LeadSheetFocusShell } from "@/components/leads/LeadSheetFocusShell"
import { LeadsTable } from "@/components/leads/LeadsBoard"
import { LeadSheetScrollArea } from "@/components/leads/LeadSheetScrollArea"
import { SaveStatusBadge } from "@/components/leads/SaveStatusBadge"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useSheetViewState } from "@/hooks/useSheetViewState"
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
  defaultCustomersSheetSort,
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
    wonDate: customer.closedDate,
    salesPrice: customer.salesPrice,
    profit: customer.profit,
    ltv: null,
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
  const { animateBoardEnter, markWorkspaceWarm } = useClientNavigation()
  const { enabledServices, loaded: servicesLoaded } = useCompanyServices()
  const { view, pending, onPresetChange, onCustomRange: onSheetCustomRange } =
    useSheetViewState("/kunder")
  const dateIsAllTime = view.preset === "all_time"
  const resetDate = useCallback(() => onPresetChange("all_time"), [onPresetChange])
  const { customers, organizationName, loading, error, reload } = useCustomers()
  // Customers mirror won leads; the lead record is what the edit popup changes.
  const { leads, leadSheet, saveLead, saveStatus, updateLead, deleteLead } = useLeads()

  useEffect(() => {
    if (!loading) markWorkspaceWarm()
  }, [loading, markWorkspaceWarm])

  const [sheetSegment, setSheetSegment] = useState<LeadSegmentId | "all">("all")
  const [sheetService, setSheetService] = useState<string | null>(null)
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

  const activeSheetSort = useMemo(
    () => sheetSort ?? defaultCustomersSheetSort(leadSheet.columns),
    [leadSheet.columns, sheetSort]
  )

  const shownLeads = useMemo(() => {
    const rows = filtered.map((customer) => leadForCustomer(customer, leadsById))
    return sortLeadsWithSheetState(rows, leadSheet.columns, activeSheetSort, enabledServices)
  }, [activeSheetSort, enabledServices, filtered, leadSheet.columns, leadsById])

  const handleSheetSort = useCallback((columnId: string, direction: SheetSortDirection | null) => {
    setSheetSort(direction ? { columnId, direction } : null)
  }, [])

  const customersEmptyText = useMemo(() => {
    if (
      !dateIsAllTime &&
      !search.trim() &&
      sourceFilter === "all" &&
      sheetSegment === "all" &&
      !sheetService
    ) {
      return t("customersEmptyPeriod")
    }
    return t("customersEmpty")
  }, [dateIsAllTime, search, sheetSegment, sheetService, sourceFilter, t])

  const totals = useMemo(() => {
    const base = sumCustomerValue(filtered)
    const ltv = shownLeads.reduce((sum, lead) => sum + (lead.ltv ?? 0), 0)
    return { ...base, ltv }
  }, [filtered, shownLeads])

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

  const pageHeader = (
    <header className="flex flex-wrap items-start justify-between gap-3">
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
  )

  return (
    <AdminClientRouteGate>
      <ClientCorePageShell header={pageHeader} bodyClassName="gap-6">
        {loading ? (
          <ClientBoardLoadingState variant="customers" />
        ) : (
          <ClientBoardEnter
            className="client-core-settle-stack flex min-h-0 flex-1 flex-col gap-6"
            pending={pending}
            animateEnter={animateBoardEnter}
          >
            {!sheetFocusOpen ? (
            <section aria-label={t("customersOverviewAria")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <OverviewStat
                  label={t("customersStatLtv")}
                  value={formatCurrencyDKK(totals.ltv)}
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
                    sheetSort={activeSheetSort}
                    onSheetSort={handleSheetSort}
                    emptyText={customersEmptyText}
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
                "dashboard-card flex max-h-[calc(100dvh-7rem)] min-h-[24rem] flex-col overflow-hidden",
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
                  sheetSort={activeSheetSort}
                  onSheetSort={handleSheetSort}
                  emptyText={customersEmptyText}
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
                    emptyText={customersEmptyText}
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
      </ClientCorePageShell>
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

