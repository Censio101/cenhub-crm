import {
  commercialAmountInMonth,
  lineCoversMonth,
} from "@/lib/internal/commercial-billing"
import { normalizeCustomerContact } from "@/lib/internal/customer-contact"
import {
  earliestLineStart,
  expectedPipelineMrr,
  gapCashflowUntilStart,
  pipelineKindFor,
  projectedRevenueFrom,
  type PipelineKind,
} from "@/lib/internal/pipeline-metrics"
import { syntheticDanishPhone } from "@/lib/leads"
import { lineMatchesService, type ServiceId } from "@/lib/internal/services"
import { DANISH_MONTHS_SHORT } from "@/lib/performance/format"
import type {
  AuthUser,
  CommercialCadence,
  CommercialCategory,
  CommercialLine,
  CustomerContact,
  CustomerDocument,
  CustomerPerson,
  Membership,
  Workspace,
} from "@/lib/onboarding/types"

export const COMMERCIAL_CATEGORIES: CommercialCategory[] = [
  "marketing",
  "seo",
  "geo",
  "website",
  "hosting",
  "support",
]

export function customerDisplayPhone(workspaceId: string, phone?: string) {
  const trimmed = phone?.trim() ?? ""
  return trimmed || syntheticDanishPhone(workspaceId)
}

export const CATEGORY_LABELS: Record<CommercialCategory, string> = {
  marketing: "Marketing",
  seo: "SEO",
  geo: "GEO",
  website: "Hjemmeside",
  hosting: "Hosting",
  support: "Support",
}

export type PackageFlags = Record<CommercialCategory, boolean>

export type InternalCustomer = {
  workspaceId: string
  name: string
  status: Workspace["status"]
  /** Dato workspace blev oprettet i Censio Internal. */
  createdAt: string
  customerSince: string
  tenureMonths: number
  mrr: number
  value: number
  packages: PackageFlags
  packageCount: number
  missing: CommercialCategory[]
  lines: CommercialLine[]
  email: string
  phone: string
  subEmail: string
  contactName: string
  cvr: string
  website: string
  people: CustomerPerson[]
  documents: CustomerDocument[]
}

export type InternalMonth = {
  month: number
  label: string
  revenue: number
  cumulative: number
}

export type PendingCustomer = {
  workspaceId: string
  name: string
  email: string
  phone: string
  subEmail: string
  createdAt: string
  customerSince: string
  /** @deprecated Brug expectedMrr — beholdt for kompatibilitet */
  mrr: number
  value: number
  lines: CommercialLine[]
  documents: CustomerDocument[]
  pipelineKind: PipelineKind
  expectedStart: string
  expectedMrr: number
  projectedYearValue: number
  gapUntilStart: number
}

export type ServiceCashflow = {
  asOf: string
  subscription: number
  meta: number
  google: number
  seoGeo: number
  hosting: number
  support: number
  marketingCustomers: number
}

export type InternalOverview = {
  year: number
  years: number[]
  today: string
  kpis: {
    mrr: number
    monthRevenue: number
    yearRevenue: number
    activeCustomers: number
    averageValue: number
    pendingRevenue: number
  }
  cashflow: ServiceCashflow
  yearTotal: number
  previousYearTotal: number | null
  months: InternalMonth[]
  comparisonMonths: number[] | null
  serviceMonths: {
    category: CommercialCategory
    label: string
    values: number[]
    previous: number[]
  }[]
  pendingCustomers: PendingCustomer[]
  customers: InternalCustomer[]
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthBounds(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, "0")
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

function isMonthlyActive(line: CommercialLine, start: string, end: string) {
  if (line.cadence !== "monthly") return false
  if (line.startsOn > end) return false
  if (line.endsOn && line.endsOn < start) return false
  return true
}

function monthlyAmountInRange(line: CommercialLine, start: string, end: string) {
  const year = Number(start.slice(0, 4))
  const monthIndex = Number(start.slice(5, 7)) - 1
  if (!lineCoversMonth(line, year, monthIndex)) return 0
  return commercialAmountInMonth(line, year, monthIndex)
}

export function cashflowAsOf(year: number, today: string) {
  return Number(today.slice(0, 4)) === year ? today : `${year}-12-31`
}

function isMarketingLine(line: CommercialLine) {
  return (
    lineMatchesService(line, "meta") ||
    lineMatchesService(line, "google") ||
    lineMatchesService(line, "video")
  )
}

function isHostingCashflowLine(line: CommercialLine) {
  return (
    lineMatchesService(line, "hjemmeside") ||
    lineMatchesService(line, "webshop") ||
    lineMatchesService(line, "hosting")
  )
}

export function serviceCashflow(
  lines: CommercialLine[],
  year: number,
  today: string
): ServiceCashflow {
  const asOf = cashflowAsOf(year, today)
  const active = lines.filter((line) => isMonthlyActive(line, asOf, asOf))
  const amount = (matches: (line: CommercialLine) => boolean) =>
    active.reduce(
      (sum, line) => (matches(line) ? sum + monthlyAmountInRange(line, asOf, asOf) : sum),
      0
    )
  return {
    asOf,
    subscription: amount(() => true),
    meta: amount((line) => lineMatchesService(line, "meta")),
    google: amount((line) => lineMatchesService(line, "google")),
    seoGeo: amount(
      (line) => lineMatchesService(line, "seo") || lineMatchesService(line, "geo")
    ),
    hosting: amount(isHostingCashflowLine),
    support: amount((line) => lineMatchesService(line, "support")),
    marketingCustomers: new Set(
      active.filter(isMarketingLine).map((line) => line.workspaceId)
    ).size,
  }
}

export function filterLinesForService(
  lines: CommercialLine[],
  service: "all" | ServiceId
) {
  if (service === "all") return lines
  return lines.filter((line) => lineMatchesService(line, service))
}

export function monthRevenue(
  lines: CommercialLine[],
  year: number,
  monthIndex: number
): number {
  const { start, end } = monthBounds(year, monthIndex)
  return lines.reduce((sum, line) => {
    if (line.cadence === "monthly" && lineCoversMonth(line, year, monthIndex)) {
      return sum + commercialAmountInMonth(line, year, monthIndex)
    }
    if (
      line.cadence === "once" &&
      line.startsOn >= start &&
      line.startsOn <= end
    ) {
      return sum + line.amount
    }
    return sum
  }, 0)
}

function holdsCategory(
  lines: CommercialLine[],
  category: CommercialCategory,
  today: string
): boolean {
  return lines.some((line) => {
    if (line.category !== category || line.startsOn > today) return false
    if (line.cadence === "once") return true
    return !line.endsOn || line.endsOn >= today
  })
}

export function spentToDate(lines: CommercialLine[], today: string) {
  return customerValue(lines, today)
}

function customerValue(
  lines: CommercialLine[],
  today: string
): number {
  if (lines.length === 0) return 0
  const first = lines.reduce(
    (earliest, line) => (line.startsOn < earliest ? line.startsOn : earliest),
    lines[0].startsOn
  )
  const startYear = Number(first.slice(0, 4))
  const startMonth = Number(first.slice(5, 7)) - 1
  const endYear = Number(today.slice(0, 4))
  const endMonth = Number(today.slice(5, 7)) - 1
  let total = 0
  for (let year = startYear; year <= endYear; year += 1) {
    const from = year === startYear ? startMonth : 0
    const to = year === endYear ? endMonth : 11
    for (let month = from; month <= to; month += 1) {
      total += monthRevenue(lines, year, month)
    }
  }
  return total
}

function tenureMonths(since: string, today: string): number {
  const startYear = Number(since.slice(0, 4))
  const startMonth = Number(since.slice(5, 7))
  const endYear = Number(today.slice(0, 4))
  const endMonth = Number(today.slice(5, 7))
  return Math.max(0, (endYear - startYear) * 12 + (endMonth - startMonth))
}

function contactNameFor(
  workspaceId: string,
  users: AuthUser[] | undefined,
  memberships: Membership[] | undefined
) {
  const membership = memberships?.find(
    (item) => item.workspaceId === workspaceId && item.role === "admin"
  )
  return users?.find((user) => user.id === membership?.userId)?.name ?? ""
}

function billableWorkspaces(workspaces: Workspace[]) {
  return workspaces.filter((workspace) => !workspace.useDemoData)
}

function seriesForYear(lines: CommercialLine[], year: number) {
  return Array.from({ length: 12 }, (_, monthIndex) => monthRevenue(lines, year, monthIndex))
}

export function buildInternalOverview(input: {
  workspaces: Workspace[]
  lines: CommercialLine[]
  year: number
  now?: Date
  contacts?: CustomerContact[]
  documents?: CustomerDocument[]
  users?: AuthUser[]
  memberships?: Membership[]
}): InternalOverview {
  const now = input.now ?? new Date()
  const today = dateKey(now)
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const included = billableWorkspaces(input.workspaces)
  const active = included.filter((workspace) => workspace.status === "active")
  const pipeline = included.filter(
    (workspace) => workspace.status === "pending" || workspace.status === "awaiting_start"
  )
  const activeIds = new Set(active.map((workspace) => workspace.id))
  const pipelineIds = new Set(pipeline.map((workspace) => workspace.id))
  const lines = input.lines.filter((line) => activeIds.has(line.workspaceId))
  const pipelineLines = input.lines.filter((line) => pipelineIds.has(line.workspaceId))

  const customers: InternalCustomer[] = active.map((workspace) => {
    const own = lines.filter((line) => line.workspaceId === workspace.id)
    const packages = Object.fromEntries(
      COMMERCIAL_CATEGORIES.map((category) => [
        category,
        holdsCategory(own, category, today),
      ])
    ) as PackageFlags
    const missing = COMMERCIAL_CATEGORIES.filter((category) => !packages[category])
    const since =
      own.reduce<string | null>(
        (earliest, line) =>
          earliest == null || line.startsOn < earliest ? line.startsOn : earliest,
        null
      ) ?? workspace.createdAt.slice(0, 10)
    const mrr = own.reduce(
      (sum, line) => sum + monthlyAmountInRange(line, today, today),
      0
    )
    const rawContact = input.contacts?.find((item) => item.workspaceId === workspace.id)
    const contact = rawContact
      ? normalizeCustomerContact(rawContact, workspace.email)
      : normalizeCustomerContact({ workspaceId: workspace.id }, workspace.email)
    const fallbackName =
      contact.contactName ||
      contactNameFor(workspace.id, input.users, input.memberships) ||
      workspace.name
    if (!contact.people.length && fallbackName) {
      contact.people = [
        {
          id: "legacy",
          name: fallbackName,
          title: "",
          phones: contact.phone
            ? [{ id: "legacy-phone", label: "Hoved", number: contact.phone }]
            : [],
          emails: contact.subEmail
            ? [{ id: "legacy-email", label: "Direkte", email: contact.subEmail }]
            : [],
        },
      ]
    }
    return {
      workspaceId: workspace.id,
      name: workspace.name,
      status: workspace.status,
      createdAt: workspace.createdAt.slice(0, 10),
      customerSince: since,
      tenureMonths: tenureMonths(since, today),
      mrr,
      value: customerValue(own, today),
      packages,
      packageCount: COMMERCIAL_CATEGORIES.length - missing.length,
      missing,
      lines: own,
      email: workspace.email,
      phone: customerDisplayPhone(workspace.id, contact.phone),
      subEmail: contact.subEmail,
      contactName: fallbackName,
      cvr: contact.cvr,
      website: contact.website,
      people: contact.people,
      documents: (input.documents ?? []).filter((document) => document.workspaceId === workspace.id),
    }
  })

  const paying = customers.filter((customer) => customer.value > 0 || customer.mrr > 0)
  const mrr = customers.reduce((sum, customer) => sum + customer.mrr, 0)
  const monthRevenueNow = monthRevenue(lines, currentYear, currentMonth)
  const pendingCustomers = pipeline.map((workspace) => {
    const own = pipelineLines.filter((line) => line.workspaceId === workspace.id)
    const contact = input.contacts?.find((item) => item.workspaceId === workspace.id)
    const expectedStart = earliestLineStart(own) || workspace.createdAt.slice(0, 10)
    const expectedMrr = expectedPipelineMrr(own, today)
    const projectedYearValue = projectedRevenueFrom(own, expectedStart, 12)
    const gapUntilStart = gapCashflowUntilStart(expectedMrr, expectedStart, today)
    const kind = pipelineKindFor(workspace.status) ?? "onboarding"
    return {
      workspaceId: workspace.id,
      name: workspace.name,
      email: workspace.email,
      phone: customerDisplayPhone(workspace.id, contact?.phone),
      subEmail: contact?.subEmail ?? "",
      createdAt: workspace.createdAt.slice(0, 10),
      customerSince: expectedStart,
      mrr: expectedMrr,
      expectedMrr,
      expectedStart,
      projectedYearValue,
      gapUntilStart,
      pipelineKind: kind,
      value: customerValue(own, today),
      lines: own,
      documents: (input.documents ?? []).filter((document) => document.workspaceId === workspace.id),
    }
  })
  const pendingRevenue = pendingCustomers.reduce((sum, customer) => sum + customer.expectedMrr, 0)
  const averageValue =
    paying.length === 0
      ? 0
      : paying.reduce((sum, customer) => sum + customer.value, 0) / paying.length

  const years = new Set<number>([currentYear, input.year])
  for (const line of lines) {
    years.add(Number(line.startsOn.slice(0, 4)))
    if (line.endsOn) years.add(Number(line.endsOn.slice(0, 4)))
  }

  const yearValues = seriesForYear(lines, input.year)
  let cumulative = 0
  const months: InternalMonth[] = yearValues.map((revenue, monthIndex) => {
    cumulative += revenue
    return {
      month: monthIndex + 1,
      label: DANISH_MONTHS_SHORT[monthIndex],
      revenue,
      cumulative,
    }
  })
  const comparisonMonths = seriesForYear(lines, input.year - 1)
  const serviceMonths = COMMERCIAL_CATEGORIES.map((category) => {
    const categoryLines = lines.filter((line) => line.category === category)
    return {
      category,
      label: CATEGORY_LABELS[category],
      values: seriesForYear(categoryLines, input.year),
      previous: seriesForYear(categoryLines, input.year - 1),
    }
  })

  const yearTotal = months[11]?.cumulative ?? 0
  const previousYearTotal =
    input.year > Math.min(...years)
      ? Array.from({ length: 12 }, (_, monthIndex) =>
          monthRevenue(lines, input.year - 1, monthIndex)
        ).reduce((sum, value) => sum + value, 0)
      : null

  return {
    year: input.year,
    years: [...years].sort((left, right) => left - right),
    today,
    kpis: {
      mrr,
      monthRevenue: monthRevenueNow,
      yearRevenue: yearTotal,
      activeCustomers: customers.filter((customer) => customer.mrr > 0).length,
      averageValue,
      pendingRevenue,
    },
    cashflow: serviceCashflow(lines, input.year, today),
    yearTotal,
    previousYearTotal,
    months,
    comparisonMonths,
    serviceMonths,
    pendingCustomers,
    customers,
  }
}

export function isCommercialCategory(value: string): value is CommercialCategory {
  return COMMERCIAL_CATEGORIES.includes(value as CommercialCategory)
}

export function isCommercialCadence(value: string): value is CommercialCadence {
  return value === "monthly" || value === "once"
}
