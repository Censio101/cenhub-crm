import {
  isServiceId,
  resolveServiceLabel,
  type NamedService,
  type ServiceId,
} from "@/lib/performance/services"

export const LEAD_SEGMENTS = [
  { id: "b2c", label: "Privat" },
  { id: "b2b", label: "Erhverv" },
] as const

export type LeadSegmentId = (typeof LEAD_SEGMENTS)[number]["id"]

export const LEAD_PLATFORMS = [
  { id: "meta", label: "IG & FB" },
  { id: "website", label: "Hjemmeside" },
  { id: "landing", label: "Landing page" },
] as const

export type LeadPlatformId = (typeof LEAD_PLATFORMS)[number]["id"]

export const LEAD_STATUSES = [
  { id: "not_qualified", label: "Ikke kvalificeret" },
  { id: "lost", label: "Mistet lead" },
  { id: "new_waiting_call", label: "Nyt lead, venter på opkald" },
  { id: "call_1", label: "Opkald 1" },
  { id: "call_2", label: "Opkald 2" },
  { id: "call_3", label: "Opkald 3" },
  { id: "call_4", label: "Opkald 4" },
  { id: "call_5", label: "Opkald 5" },
  { id: "waiting_on_client", label: "Venter på kunden" },
  { id: "client_waiting_on_us", label: "Kunden venter på os" },
  { id: "awaiting_proposal", label: "Afventer tilbud" },
  { id: "proposal_sent", label: "Tilbud sendt" },
  { id: "won", label: "Vundet kunde" },
] as const

export type LeadStatusId = (typeof LEAD_STATUSES)[number]["id"]

export type Lead = {
  id: string
  date: string
  fullName: string
  email: string
  phone: string
  segment: LeadSegmentId | ""
  companyName: string
  address: string
  zipCode: string
  city: string
  serviceIds: string[]
  /** @deprecated Prefer `serviceIds`. Kept so older single-service values still display. */
  service?: ServiceId | ""
  platform: LeadPlatformId | ""
  /** Meta Lead Ads / Instant Form ad id used to match incoming Meta leads. */
  metaAdId: string
  status: LeadStatusId
  salesPrice: number | null
  profit: number | null
}

export function getLeadServiceIds(lead: {
  serviceIds?: readonly string[]
  service?: ServiceId | ""
}): string[] {
  const fromArray =
    lead.serviceIds?.filter((id) => typeof id === "string" && id.length > 0) ?? []
  if (fromArray.length > 0) {
    const seen = new Set<string>()
    return fromArray.filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
  return lead.service && isServiceId(lead.service) ? [lead.service] : []
}

export function formatLeadServices(
  lead: {
    serviceIds?: readonly string[]
    service?: ServiceId | ""
  },
  extras: readonly NamedService[] = []
): string {
  return getLeadServiceIds(lead)
    .map((id) => resolveServiceLabel(id, extras))
    .join(", ")
}

export function isLeadSegmentId(value: string): value is LeadSegmentId {
  return LEAD_SEGMENTS.some((item) => item.id === value)
}

export function isLeadPlatformId(value: string): value is LeadPlatformId {
  return LEAD_PLATFORMS.some((item) => item.id === value)
}

export function isLeadStatusId(value: string): value is LeadStatusId {
  return LEAD_STATUSES.some((item) => item.id === value)
}

export function getLeadStatusLabel(id: LeadStatusId): string {
  return LEAD_STATUSES.find((item) => item.id === id)?.label ?? id
}

const STATUS_FIELD_BASE = "border [&_svg]:text-current"

const STATUS_HIGHLIGHT = {
  won: "hover:bg-[#3f9a5e] hover:text-white hover:**:text-white focus:bg-[#3f9a5e] focus:text-white focus:**:text-white data-highlighted:bg-[#3f9a5e] data-highlighted:text-white data-highlighted:**:text-white",
  lost: "hover:bg-[#d45a4a] hover:text-white hover:**:text-white focus:bg-[#d45a4a] focus:text-white focus:**:text-white data-highlighted:bg-[#d45a4a] data-highlighted:text-white data-highlighted:**:text-white",
  muted:
    "hover:bg-[#6f6b64] hover:text-white hover:**:text-white focus:bg-[#6f6b64] focus:text-white focus:**:text-white data-highlighted:bg-[#6f6b64] data-highlighted:text-white data-highlighted:**:text-white",
  orange:
    "hover:bg-[#e4660c] hover:text-white hover:**:text-white focus:bg-[#e4660c] focus:text-white focus:**:text-white data-highlighted:bg-[#e4660c] data-highlighted:text-white data-highlighted:**:text-white",
  amber:
    "hover:bg-[#c47a1a] hover:text-white hover:**:text-white focus:bg-[#c47a1a] focus:text-white focus:**:text-white data-highlighted:bg-[#c47a1a] data-highlighted:text-white data-highlighted:**:text-white",
  blue: "hover:bg-[#2f62c8] hover:text-white hover:**:text-white focus:bg-[#2f62c8] focus:text-white focus:**:text-white data-highlighted:bg-[#2f62c8] data-highlighted:text-white data-highlighted:**:text-white",
  gold: "hover:bg-[#d4a017] hover:text-[#2a2100] hover:**:text-[#2a2100] focus:bg-[#d4a017] focus:text-[#2a2100] focus:**:text-[#2a2100] data-highlighted:bg-[#d4a017] data-highlighted:text-[#2a2100] data-highlighted:**:text-[#2a2100]",
} as const

export function getLeadStatusClass(id: LeadStatusId): string {
  switch (id) {
    case "won":
      return `${STATUS_FIELD_BASE} border-[#2f7d4a]/35 bg-[#c5e4cf] text-[#1f4d30] ${STATUS_HIGHLIGHT.won}`
    case "lost":
      return `${STATUS_FIELD_BASE} border-[#c2410c]/25 bg-[#fde8e4] text-danger-foreground ${STATUS_HIGHLIGHT.lost}`
    case "not_qualified":
      return `${STATUS_FIELD_BASE} border-border bg-muted text-muted-foreground ${STATUS_HIGHLIGHT.muted}`
    case "new_waiting_call":
      return `${STATUS_FIELD_BASE} border-primary/25 bg-[#fff1e6] text-primary ${STATUS_HIGHLIGHT.orange}`
    case "call_1":
    case "call_2":
    case "call_3":
    case "call_4":
    case "call_5":
      return `${STATUS_FIELD_BASE} border-[#b54708]/25 bg-[#fef3e2] text-[#b54708] ${STATUS_HIGHLIGHT.amber}`
    case "waiting_on_client":
      return `${STATUS_FIELD_BASE} border-[#1d4ed8]/20 bg-[#e8f0fe] text-[#1d4ed8] ${STATUS_HIGHLIGHT.blue}`
    case "client_waiting_on_us":
      return `${STATUS_FIELD_BASE} border-primary/25 bg-[#fff1e6] text-primary ${STATUS_HIGHLIGHT.orange}`
    case "awaiting_proposal":
      return `${STATUS_FIELD_BASE} border-[#a16207]/25 bg-[#fef6e0] text-[#a16207] ${STATUS_HIGHLIGHT.gold}`
    case "proposal_sent":
      return `${STATUS_FIELD_BASE} border-[#1d4ed8]/20 bg-[#e8f0fe] text-[#1d4ed8] ${STATUS_HIGHLIGHT.blue}`
  }
}

/** Full Status table-cell fill. Stronger than filter/option chips; no button chrome. */
export function getLeadStatusCellClass(id: LeadStatusId): string {
  switch (id) {
    case "won":
      return "bg-[#6fbf86] text-[#0f2e1a]"
    case "lost":
      return "bg-[#e88b7d] text-[#4a1410]"
    case "not_qualified":
      return "bg-[#d4d1cb] text-[#3f3e3a]"
    case "new_waiting_call":
      return "bg-[#f0a05a] text-[#3d1a00]"
    case "call_1":
    case "call_2":
    case "call_3":
    case "call_4":
    case "call_5":
      return "bg-[#b8956a] text-[#2a1808]"
    case "waiting_on_client":
      return "bg-[#7eace8] text-[#0c2d6b]"
    case "client_waiting_on_us":
      return "bg-[#f0a05a] text-[#3d1a00]"
    case "awaiting_proposal":
      return "bg-[#e8c547] text-[#3d3000]"
    case "proposal_sent":
      return "bg-[#7eace8] text-[#0c2d6b]"
  }
}

export function getWonLeadRowClass(status: LeadStatusId): string {
  if (status !== "won") return "hover:bg-transparent"
  return "bg-[#e8f3eb] text-[#1f4d30] hover:bg-[#dceee1] [&>td:not([data-lead-status-cell])]:bg-[#e8f3eb] [&:hover>td:not([data-lead-status-cell])]:bg-[#dceee1]"
}

export function getWonLeadCellClass(status: LeadStatusId): string {
  return status === "won" ? "bg-[#e8f3eb]" : ""
}

export function isOpenLeadStatus(status: LeadStatusId): boolean {
  return status !== "won" && status !== "lost"
}

export function sumFilledSalesPrice(leads: readonly Lead[]): number {
  return leads.reduce((sum, lead) => {
    if (lead.salesPrice == null || !Number.isFinite(lead.salesPrice)) return sum
    return sum + lead.salesPrice
  }, 0)
}

function averageFilled(
  leads: readonly Lead[],
  pick: (lead: Lead) => number | null
): number | null {
  const values = leads
    .map(pick)
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export type LeadPipelineStats = {
  openCount: number
  wonCount: number
  lostCount: number
  totalCount: number
  pipelineValue: number
  wonValue: number
  lostValue: number
  closeRate: number | null
  remainingShare: number | null
  averageWonSales: number | null
  averageWonProfit: number | null
}

export function computeLeadPipelineStats(
  leads: readonly Lead[]
): LeadPipelineStats {
  const open = leads.filter((lead) => isOpenLeadStatus(lead.status))
  const won = leads.filter((lead) => lead.status === "won")
  const lost = leads.filter((lead) => lead.status === "lost")
  const totalCount = leads.length

  return {
    openCount: open.length,
    wonCount: won.length,
    lostCount: lost.length,
    totalCount,
    pipelineValue: sumFilledSalesPrice(open),
    wonValue: sumFilledSalesPrice(won),
    lostValue: sumFilledSalesPrice(lost),
    closeRate: totalCount === 0 ? null : (won.length / totalCount) * 100,
    remainingShare: totalCount === 0 ? null : (open.length / totalCount) * 100,
    averageWonSales: averageFilled(won, (lead) => lead.salesPrice),
    averageWonProfit: averageFilled(won, (lead) => lead.profit),
  }
}

export type DashboardLeadFilter = {
  range?: { start: Date; end: Date } | null
  service?: string | null
  funnel?: LeadPlatformId | null
  segment?: LeadSegmentId | null
  ignoreDate?: boolean
}

export function filterDashboardLeads(
  leads: readonly Lead[],
  filter: DashboardLeadFilter
): Lead[] {
  return leads.filter((lead) => {
    if (!filter.ignoreDate && filter.range) {
      const date = new Date(`${lead.date}T00:00:00`)
      if (date < filter.range.start || date > filter.range.end) return false
    }
    if (filter.service && !getLeadServiceIds(lead).includes(filter.service)) {
      return false
    }
    if (filter.funnel && lead.platform !== filter.funnel) return false
    if (filter.segment && lead.segment !== filter.segment) return false
    return true
  })
}

export const ACTION_LEAD_STATUSES = [
  "new_waiting_call",
  "client_waiting_on_us",
] as const satisfies readonly LeadStatusId[]

export function getActionLeads(leads: readonly Lead[]): Lead[] {
  return leads.filter((lead) =>
    ACTION_LEAD_STATUSES.some((status) => status === lead.status)
  )
}

const REACHED_FIRST_CALL = new Set<LeadStatusId>([
  "call_1",
  "call_2",
  "call_3",
  "call_4",
  "call_5",
  "waiting_on_client",
  "client_waiting_on_us",
  "awaiting_proposal",
  "proposal_sent",
  "won",
])

const REACHED_PROPOSAL = new Set<LeadStatusId>(["proposal_sent", "won"])

export type LeadFunnelStep = {
  id: "leads" | "call" | "proposal" | "won"
  label: string
  count: number
  share: number | null
}

export function computeLeadFunnel(leads: readonly Lead[]): LeadFunnelStep[] {
  const total = leads.length
  const firstCall = leads.filter((lead) =>
    REACHED_FIRST_CALL.has(lead.status)
  ).length
  const proposal = leads.filter((lead) =>
    REACHED_PROPOSAL.has(lead.status)
  ).length
  const won = leads.filter((lead) => lead.status === "won").length

  function share(count: number): number | null {
    return total === 0 ? null : (count / total) * 100
  }

  return [
    { id: "leads", label: "Leads", count: total, share: share(total) },
    { id: "call", label: "Første opkald", count: firstCall, share: share(firstCall) },
    { id: "proposal", label: "Tilbud sendt", count: proposal, share: share(proposal) },
    { id: "won", label: "Vundet", count: won, share: share(won) },
  ]
}

export function leadMonthKey(date: string): string {
  return date.slice(0, 7)
}

export function formatLeadMonth(key: string): string {
  const [year, month] = key.split("-")
  const names = [
    "Januar",
    "Februar",
    "Marts",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "December",
  ]
  const index = Number(month) - 1
  return `${names[index] ?? month} ${year}`
}

export function previousLeadMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number)
  if (!year || !month) return key
  const previous = new Date(year, month - 2, 1)
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`
}

export function sortLeadsByDate(
  leads: readonly Lead[],
  direction: "asc" | "desc"
): Lead[] {
  return [...leads].sort((left, right) => {
    const cmp = left.date.localeCompare(right.date)
    if (cmp !== 0) return direction === "asc" ? cmp : -cmp
    return direction === "asc"
      ? left.id.localeCompare(right.id)
      : right.id.localeCompare(left.id)
  })
}

export function emptyLead(id: string, date = new Date()): Lead {
  const iso = date.toISOString().slice(0, 10)
  return {
    id,
    date: iso,
    fullName: "",
    email: "",
    phone: "",
    segment: "",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: [],
    platform: "",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
  }
}

const META_AD_IDS = [
  "1202187654321098",
  "1202191122334455",
  "1202175566778899",
] as const

function withMetaAdId<T extends { id: string; platform: LeadPlatformId | "" }>(
  lead: T
): T & { metaAdId: string } {
  if (lead.platform !== "meta") return { ...lead, metaAdId: "" }
  const index = Math.max(0, Number(lead.id.replace(/\D/g, "")) - 1)
  return { ...lead, metaAdId: META_AD_IDS[index % META_AD_IDS.length] }
}

const MOCK_LEAD_SEED = [
  {
    id: "lead-1",
    date: "2026-09-18",
    fullName: "Mette Sørensen",
    email: "mette.soerensen@gmail.com",
    phone: "20 14 88 31",
    segment: "b2c",
    companyName: "",
    address: "Strandvejen 42",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["renovering"],
    platform: "meta",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-2",
    date: "2026-09-16",
    fullName: "Peter Holm",
    email: "peter@holm-ejendomme.dk",
    phone: "51 22 09 44",
    segment: "b2b",
    companyName: "Holm Ejendomme",
    address: "Industrivej 8",
    zipCode: "3200",
    city: "Helsinge",
    serviceIds: ["tagdaekning"],
    platform: "landing",
    status: "call_1",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-3",
    date: "2026-09-12",
    fullName: "Anne Kjeldsen",
    email: "anne.kjeldsen@outlook.dk",
    phone: "28 77 41 09",
    segment: "b2c",
    companyName: "",
    address: "Birkevej 15",
    zipCode: "3100",
    city: "Hornbæk",
    serviceIds: ["badevaerelse"],
    platform: "website",
    status: "waiting_on_client",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-4",
    date: "2026-09-08",
    fullName: "Lars Madsen",
    email: "lm@nordkystens-byg.dk",
    phone: "40 18 62 55",
    segment: "b2b",
    companyName: "Nordkystens Byg A/S",
    address: "Havnevej 3",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["tilbygning", "renovering"],
    platform: "meta",
    status: "proposal_sent",
    salesPrice: 186000,
    profit: 142000,
  },
  {
    id: "lead-5",
    date: "2026-09-04",
    fullName: "Sofie Brandt",
    email: "sofiebrandt@icloud.com",
    phone: "61 03 27 18",
    segment: "b2c",
    companyName: "",
    address: "Skovbakken 9",
    zipCode: "3480",
    city: "Fredensborg",
    serviceIds: ["nybyg"],
    platform: "landing",
    status: "awaiting_proposal",
    salesPrice: 248000,
    profit: null,
  },
  {
    id: "lead-6",
    date: "2026-08-29",
    fullName: "Henrik Vestergaard",
    email: "henrik.vestergaard@gmail.com",
    phone: "22 91 50 73",
    segment: "b2c",
    companyName: "",
    address: "Ådalsvej 27",
    zipCode: "3060",
    city: "Espergærde",
    serviceIds: ["renovering", "tagdaekning"],
    platform: "website",
    status: "won",
    salesPrice: 78500,
    profit: 61200,
  },
  {
    id: "lead-7",
    date: "2026-08-21",
    fullName: "Camilla Nørgaard",
    email: "cn@norgaard-holding.dk",
    phone: "31 44 08 92",
    segment: "b2b",
    companyName: "Nørgaard Holding",
    address: "Kongevejen 110",
    zipCode: "3490",
    city: "Kvistgård",
    serviceIds: ["tagdaekning"],
    platform: "meta",
    status: "call_2",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-8",
    date: "2026-08-14",
    fullName: "Jonas Berg",
    email: "jonasberg90@hotmail.com",
    phone: "27 16 33 04",
    segment: "b2c",
    companyName: "",
    address: "Parkvej 4",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["badevaerelse"],
    platform: "meta",
    status: "lost",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-9",
    date: "2026-08-07",
    fullName: "Eva Lund",
    email: "eva.lund@gmail.com",
    phone: "53 28 11 67",
    segment: "b2c",
    companyName: "",
    address: "Mosevej 18",
    zipCode: "3230",
    city: "Græsted",
    serviceIds: ["renovering"],
    platform: "website",
    status: "not_qualified",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-10",
    date: "2026-07-22",
    fullName: "Thomas Ravn",
    email: "thomas@ravn-bolig.dk",
    phone: "42 19 70 33",
    segment: "b2b",
    companyName: "Ravn Bolig",
    address: "Stationsvej 6",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["tilbygning"],
    platform: "landing",
    status: "won",
    salesPrice: 312000,
    profit: 248000,
  },
  {
    id: "lead-11",
    date: "2026-07-09",
    fullName: "Ida Kruse",
    email: "ida.kruse@gmail.com",
    phone: "26 84 11 50",
    segment: "b2c",
    companyName: "",
    address: "Solbakken 12",
    zipCode: "3150",
    city: "Hellebæk",
    serviceIds: ["badevaerelse"],
    platform: "meta",
    status: "proposal_sent",
    salesPrice: 94000,
    profit: null,
  },
  {
    id: "lead-12",
    date: "2026-06-26",
    fullName: "Rikke Højgaard",
    email: "rikke.hoejgaard@gmail.com",
    phone: "23 61 04 88",
    segment: "b2c",
    companyName: "",
    address: "Nordre Strandvej 88",
    zipCode: "3140",
    city: "Ålsgårde",
    serviceIds: ["tagdaekning"],
    platform: "meta",
    status: "won",
    salesPrice: 124000,
    profit: 91000,
  },
  {
    id: "lead-13",
    date: "2026-06-11",
    fullName: "Mikkel Frost",
    email: "mikkel@frost-ejendom.dk",
    phone: "30 19 77 42",
    segment: "b2b",
    companyName: "Frost Ejendom ApS",
    address: "Kongevejen 214",
    zipCode: "2970",
    city: "Hørsholm",
    serviceIds: ["renovering", "tilbygning"],
    platform: "landing",
    status: "proposal_sent",
    salesPrice: 428000,
    profit: null,
  },
  {
    id: "lead-14",
    date: "2026-05-28",
    fullName: "Line Bach",
    email: "line.bach@outlook.dk",
    phone: "61 82 40 15",
    segment: "b2c",
    companyName: "",
    address: "Gammel Strandvej 19",
    zipCode: "3050",
    city: "Humlebæk",
    serviceIds: ["badevaerelse", "renovering"],
    platform: "website",
    status: "won",
    salesPrice: 156000,
    profit: 118000,
  },
  {
    id: "lead-15",
    date: "2026-05-09",
    fullName: "Andreas Kjær",
    email: "ak@kjaer-bolig.dk",
    phone: "40 55 12 90",
    segment: "b2b",
    companyName: "Kjær Bolig",
    address: "Stationsvej 21",
    zipCode: "2980",
    city: "Kokkedal",
    serviceIds: ["nybyg"],
    platform: "meta",
    status: "lost",
    salesPrice: 890000,
    profit: null,
  },
  {
    id: "lead-16",
    date: "2026-04-22",
    fullName: "Helle Winther",
    email: "helle.winther@gmail.com",
    phone: "28 14 63 07",
    segment: "b2c",
    companyName: "",
    address: "Skovvej 7",
    zipCode: "3070",
    city: "Snekkersten",
    serviceIds: ["tilbygning"],
    platform: "website",
    status: "won",
    salesPrice: 267000,
    profit: 198000,
  },
  {
    id: "lead-17",
    date: "2026-04-06",
    fullName: "Christian Dam",
    email: "cd@dam-invest.dk",
    phone: "51 33 80 26",
    segment: "b2b",
    companyName: "Dam Invest",
    address: "Hovedgaden 45",
    zipCode: "3080",
    city: "Tikøb",
    serviceIds: ["tagdaekning", "renovering"],
    platform: "landing",
    status: "call_3",
    salesPrice: 198000,
    profit: null,
  },
  {
    id: "lead-18",
    date: "2026-03-19",
    fullName: "Nanna Ellegaard",
    email: "nanna.ellegaard@icloud.com",
    phone: "22 47 91 58",
    segment: "b2c",
    companyName: "",
    address: "Havnevej 12",
    zipCode: "3250",
    city: "Gilleleje",
    serviceIds: ["renovering"],
    platform: "meta",
    status: "won",
    salesPrice: 64000,
    profit: 49200,
  },
  {
    id: "lead-19",
    date: "2026-03-04",
    fullName: "Ole Bjerre",
    email: "ole@bjerre-gaard.dk",
    phone: "42 08 66 31",
    segment: "b2b",
    companyName: "Bjerre Gaard",
    address: "Gadekæret 3",
    zipCode: "3230",
    city: "Græsted",
    serviceIds: ["nybyg", "tagdaekning"],
    platform: "website",
    status: "awaiting_proposal",
    salesPrice: 540000,
    profit: null,
  },
  {
    id: "lead-20",
    date: "2026-02-17",
    fullName: "Signe Møller",
    email: "signe.moeller@gmail.com",
    phone: "26 90 14 73",
    segment: "b2c",
    companyName: "",
    address: "Øresundsvej 6",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["badevaerelse"],
    platform: "meta",
    status: "won",
    salesPrice: 88000,
    profit: 67000,
  },
  {
    id: "lead-21",
    date: "2026-02-03",
    fullName: "Jesper Holst",
    email: "jesper@holst-udlejning.dk",
    phone: "31 72 05 49",
    segment: "b2b",
    companyName: "Holst Udlejning",
    address: "Industrivænget 14",
    zipCode: "3200",
    city: "Helsinge",
    serviceIds: ["renovering"],
    platform: "landing",
    status: "lost",
    salesPrice: 142000,
    profit: null,
  },
  {
    id: "lead-22",
    date: "2026-01-21",
    fullName: "Maria Lindberg",
    email: "maria.lindberg@outlook.dk",
    phone: "60 18 33 92",
    segment: "b2c",
    companyName: "",
    address: "Bøgevej 31",
    zipCode: "3480",
    city: "Fredensborg",
    serviceIds: ["tilbygning"],
    platform: "website",
    status: "won",
    salesPrice: 214000,
    profit: 161000,
  },
  {
    id: "lead-23",
    date: "2026-01-08",
    fullName: "Anders Pihl",
    email: "anders@pihl-gruppen.dk",
    phone: "40 27 58 11",
    segment: "b2b",
    companyName: "Pihl Gruppen",
    address: "Havnegade 9",
    zipCode: "2990",
    city: "Nivå",
    serviceIds: ["tagdaekning"],
    platform: "meta",
    status: "not_qualified",
    salesPrice: null,
    profit: null,
  },
  {
    id: "lead-24",
    date: "2025-12-12",
    fullName: "Louise Kragh",
    email: "louise.kragh@gmail.com",
    phone: "27 44 19 60",
    segment: "b2c",
    companyName: "",
    address: "Kirkevej 5",
    zipCode: "3100",
    city: "Hornbæk",
    serviceIds: ["renovering", "badevaerelse"],
    platform: "website",
    status: "won",
    salesPrice: 173000,
    profit: 129000,
  },
  {
    id: "lead-25",
    date: "2025-11-18",
    fullName: "Martin Søndergaard",
    email: "ms@soendergaard-ejendomme.dk",
    phone: "53 11 80 24",
    segment: "b2b",
    companyName: "Søndergaard Ejendomme",
    address: "Slotsgade 18",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["nybyg"],
    platform: "landing",
    status: "won",
    salesPrice: 612000,
    profit: 458000,
  },
  {
    id: "lead-26",
    date: "2025-10-07",
    fullName: "Katrine Dahl",
    email: "katrine.dahl@icloud.com",
    phone: "21 66 03 47",
    segment: "b2c",
    companyName: "",
    address: "Skovridergårdsvej 2",
    zipCode: "3060",
    city: "Espergærde",
    serviceIds: ["tagdaekning"],
    platform: "meta",
    status: "lost",
    salesPrice: 98000,
    profit: null,
  },
]

export const MOCK_LEADS: Lead[] = MOCK_LEAD_SEED.map(withMetaAdId)
