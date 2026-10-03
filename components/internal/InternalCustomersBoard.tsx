"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import {
  BriefcaseIcon,
  Building2Icon,
  CalendarIcon,
  ChevronDownIcon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { CustomerPeopleEditor } from "@/components/internal/CustomerPeopleEditor"
import { ExpectedCustomerDialog } from "@/components/internal/ExpectedCustomerDialog"
import { InternalPipelineCustomers } from "@/components/internal/InternalPipelineCustomers"
import { loadInternalOverview } from "@/components/internal/overview"
import { ServiceSelect } from "@/components/internal/ServiceSelect"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { onboardingFieldClass } from "@/components/onboarding/field"
import {
  COMMERCIAL_CATEGORIES,
  monthRevenue,
  spentToDate,
  type InternalCustomer,
  type InternalOverview,
  type PackageFlags,
  type PendingCustomer,
} from "@/lib/internal/metrics"
import { CENSIO_SERVICES, lineMatchesService, type ServiceId } from "@/lib/internal/services"
import {
  commercialAmountInMonth,
  commercialCurrentAmount,
  resolveBillingPeriods,
} from "@/lib/internal/commercial-billing"
import { CommercialBillingPeriodsEditor } from "@/components/internal/CommercialBillingPeriodsEditor"
import { contactEntryId, emptyPerson, websiteHref } from "@/lib/internal/customer-contact"
import type {
  CommercialCategory,
  CommercialLine,
  CustomerPerson,
} from "@/lib/onboarding/types"
import { DANISH_MONTHS_SHORT, formatAxisValue, formatCurrencyDKK, formatDateRangeLabel } from "@/lib/performance/format"

type SortKey =
  | "name"
  | "phone"
  | "email"
  | "services"
  | "since"
  | "mrr"
  | "created"
  | "value"
type SortDirection = "asc" | "desc"

const SERVICE_LABELS: Record<ServiceId, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  video: "Video",
  seo: "SEO",
  geo: "GEO",
  hjemmeside: "Hjemmeside",
  webshop: "Webshop",
  hosting: "Hosting",
  support: "Support",
}

const SERVICE_DEFAULT_AMOUNTS: Partial<Record<ServiceId, number>> = {
  meta: 6900,
  google: 4900,
  video: 3900,
  seo: 3500,
  geo: 2500,
  hjemmeside: 499,
  webshop: 899,
  hosting: 499,
  support: 1990,
}

const COLUMNS: { id: SortKey; label: string; sortable: boolean }[] = [
  { id: "name", label: "Kunde", sortable: true },
  { id: "phone", label: "Telefon", sortable: true },
  { id: "email", label: "E-mail", sortable: true },
  { id: "services", label: "Services", sortable: true },
  { id: "since", label: "Kunde siden", sortable: true },
  { id: "mrr", label: "MRR", sortable: true },
  { id: "created", label: "Oprettet", sortable: true },
  { id: "value", label: "Omsætning", sortable: true },
]

function phoneSortKey(phone: string) {
  return phone.replace(/\D/g, "")
}

const CASHFLOW = "#46C7A0"

function paymentMonths(lines: CommercialLine[], today: string) {
  if (lines.length === 0) return []
  const first = lines.reduce(
    (earliest, line) => (line.startsOn < earliest ? line.startsOn : earliest),
    lines[0].startsOn
  )
  const startYear = Number(first.slice(0, 4))
  const startMonth = Number(first.slice(5, 7)) - 1
  const endYear = Number(today.slice(0, 4))
  const endMonth = Number(today.slice(5, 7)) - 1
  const points: { label: string; value: number }[] = []
  for (let year = startYear; year <= endYear; year += 1) {
    const from = year === startYear ? startMonth : 0
    const to = year === endYear ? endMonth : 11
    for (let month = from; month <= to; month += 1) {
      const short = DANISH_MONTHS_SHORT[month]
      points.push({
        label: startYear === endYear ? short : `${short} ${String(year).slice(2)}`,
        value: monthRevenue(lines, year, month),
      })
    }
  }
  return points
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const SERVICE_LINE: Record<ServiceId, { category: CommercialCategory; name: string }> = {
  meta: { category: "marketing", name: "Meta ads" },
  google: { category: "marketing", name: "Google ads" },
  video: { category: "marketing", name: "Video" },
  seo: { category: "seo", name: "SEO" },
  geo: { category: "geo", name: "GEO" },
  hjemmeside: { category: "website", name: "Hjemmeside" },
  webshop: { category: "website", name: "Webshop" },
  hosting: { category: "hosting", name: "Hosting" },
  support: { category: "support", name: "Support pakke" },
}

function customerServices(lines: CommercialLine[]) {
  return CENSIO_SERVICES.filter((service) => lines.some((line) => lineMatchesService(line, service.id)))
}

function serviceForLine(line: CommercialLine): ServiceId | undefined {
  const name = line.name.toLowerCase()
  if (name.includes("meta")) return "meta"
  if (name.includes("google")) return "google"
  if (name.includes("video")) return "video"
  if (name.includes("webshop")) return "webshop"
  if (line.category === "seo") return "seo"
  if (line.category === "geo") return "geo"
  if (line.category === "hosting" && !name.includes("webshop") && !name.includes("hjemmeside")) {
    return "hosting"
  }
  if (line.category === "support") return "support"
  if (name.includes("hjemmeside") || line.category === "website") return "hjemmeside"
  return undefined
}

function serviceIsActive(line: CommercialLine | undefined, today: string) {
  if (!line) return false
  return !line.endsOn || line.endsOn > today
}

function dayBefore(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return toIso(date)
}

function patchLine(
  lines: CommercialLine[],
  lineId: string,
  patch: Partial<Pick<CommercialLine, "amount" | "startsOn" | "endsOn" | "note" | "billingPeriods">>
) {
  return lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
}

function normalizeDraftLine(line: CommercialLine): CommercialLine {
  const billingPeriods = resolveBillingPeriods(line)
  return { ...line, billingPeriods }
}

function createServiceLine(
  serviceId: ServiceId,
  workspaceId: string,
  today: string,
  amount: number
): CommercialLine {
  const spec = SERVICE_LINE[serviceId]
  return {
    id: `line_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    workspaceId,
    category: spec.category,
    name: spec.name,
    amount,
    cadence: "monthly",
    startsOn: today,
    endsOn: null,
    note: "",
    billingPeriods: [
      {
        id: crypto.randomUUID(),
        from: today,
        to: null,
        amount,
        note: "",
      },
    ],
  }
}

function serviceLineLabel(line: CommercialLine) {
  const serviceId = serviceForLine(line)
  return serviceId ? SERVICE_LABELS[serviceId] : line.name
}

function ServiceIconOverview({ lines }: { lines: CommercialLine[] }) {
  const held = customerServices(lines)
  if (held.length === 0) {
    return <span className="text-sm text-[var(--text-secondary)]">Ingen</span>
  }
  return (
    <ul
      className="flex max-w-[11rem] flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label={held.map((service) => SERVICE_LABELS[service.id]).join(", ")}
    >
      {held.map((service) => {
        const Icon = service.icon
        return (
          <li
            key={service.id}
            className="flex shrink-0 items-center"
            title={SERVICE_LABELS[service.id]}
          >
            <Icon className="size-5 shrink-0" style={{ color: service.color }} aria-hidden />
          </li>
        )
      })}
    </ul>
  )
}

function serviceVisual(line: CommercialLine) {
  const serviceId = serviceForLine(line)
  const service = serviceId ? CENSIO_SERVICES.find((item) => item.id === serviceId) : undefined
  return { serviceId, service, label: serviceLineLabel(line) }
}

function activeMonthlyTotal(lines: CommercialLine[], today: string) {
  const year = Number(today.slice(0, 4))
  const monthIndex = Number(today.slice(5, 7)) - 1
  return lines.reduce((sum, line) => {
    if (line.cadence !== "monthly" || !serviceIsActive(line, today)) return sum
    return sum + commercialAmountInMonth(line, year, monthIndex)
  }, 0)
}

function ServiceLineIcon({ line }: { line: CommercialLine }) {
  const { service } = serviceVisual(line)
  if (!service) return null
  const Icon = service.icon
  return (
    <Icon className="size-5 shrink-0" style={{ color: service.color }} aria-hidden />
  )
}

function pendingAsCustomer(customer: PendingCustomer): InternalCustomer {
  const packages = Object.fromEntries(
    COMMERCIAL_CATEGORIES.map((category) => [category, false])
  ) as PackageFlags
  return {
    workspaceId: customer.workspaceId,
    name: customer.name,
    status: customer.pipelineKind === "awaiting_start" ? "awaiting_start" : "pending",
    createdAt: customer.createdAt,
    customerSince: customer.customerSince,
    tenureMonths: 0,
    mrr: customer.mrr,
    value: customer.value,
    packages,
    packageCount: customerServices(customer.lines).length,
    contactName: customer.name,
    cvr: "",
    website: "",
    people: [],
    missing: [],
    lines: customer.lines,
    email: customer.email,
    phone: customer.phone,
    subEmail: customer.subEmail,
    documents: customer.documents,
  }
}

function findCustomer(overview: InternalOverview, workspaceId: string) {
  const active = overview.customers.find((customer) => customer.workspaceId === workspaceId)
  if (active) return active
  const pending = overview.pendingCustomers.find((customer) => customer.workspaceId === workspaceId)
  return pending ? pendingAsCustomer(pending) : undefined
}

function formatCustomerDate(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "d. MMM yyyy", { locale: da })
}

function amountRangeLabel(from: string, to: string) {
  const min = amountBound(from)
  const max = amountBound(to)
  if (min == null && max == null) return "Alle"
  if (min != null && max != null) return `${formatCurrencyDKK(min)} – ${formatCurrencyDKK(max)}`
  if (min != null) return `Fra ${formatCurrencyDKK(min)}`
  return `Til ${formatCurrencyDKK(max)}`
}

function amountBound(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number(digits) : null
}

function clonePeople(people: CustomerPerson[]): CustomerPerson[] {
  return people.map((person) => ({
    ...person,
    phones: person.phones.map((phone) => ({ ...phone })),
    emails: person.emails.map((email) => ({ ...email })),
  }))
}

function peopleFromCustomer(customer: InternalCustomer): CustomerPerson[] {
  if (customer.people.length > 0) return clonePeople(customer.people)
  return [
    {
      ...emptyPerson(),
      name: customer.contactName,
      phones: customer.phone
        ? [{ id: contactEntryId(), label: "Hoved", number: customer.phone }]
        : [],
      emails: customer.subEmail
        ? [{ id: contactEntryId(), label: "Direkte", email: customer.subEmail }]
        : [],
    },
  ]
}

function ContactInfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  href?: string
}) {
  const trimmed = value.trim()
  const display = trimmed || "—"

  return (
    <li className="flex items-start gap-4">
      <Icon
        className="mt-0.5 size-7 shrink-0 text-[#E4660C]"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
        {href && trimmed ? (
          <a
            href={href}
            className="mt-0.5 block truncate text-base font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
          >
            {display}
          </a>
        ) : (
          <p className="mt-0.5 truncate text-base font-medium text-[var(--text-primary)]">{display}</p>
        )}
      </div>
    </li>
  )
}

export function InternalCustomersBoard() {
  const [overview, setOverview] = useState<InternalOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>("value")
  const [direction, setDirection] = useState<SortDirection>("desc")
  const [services, setServices] = useState<ServiceId[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [revenueFrom, setRevenueFrom] = useState("")
  const [revenueTo, setRevenueTo] = useState("")
  const [query, setQuery] = useState("")
  const [mrrFrom, setMrrFrom] = useState("")
  const [mrrTo, setMrrTo] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CommercialLine[]>([])
  const [serviceToAdd, setServiceToAdd] = useState<ServiceId | "">("")
  const [newServiceAmount, setNewServiceAmount] = useState("")
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [editingCustomerInfo, setEditingCustomerInfo] = useState(false)
  const [people, setPeople] = useState<CustomerPerson[]>([])
  const [website, setWebsite] = useState("")
  const [cvr, setCvr] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [documentNote, setDocumentNote] = useState("")
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const documentFileRef = useRef<HTMLInputElement>(null)
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false)

  async function reload() {
    const payload = await loadInternalOverview()
    setOverview(payload)
    setError(null)
    return payload
  }

  useEffect(() => {
    let active = true
    loadInternalOverview()
      .then((payload) => {
        if (!active) return
        setOverview(payload)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Kunne ikke hente kunderne.")
      })
    return () => {
      active = false
    }
  }, [])

  const customers = useMemo(() => {
    if (!overview) return []
    const minRevenue = amountBound(revenueFrom)
    const maxRevenue = amountBound(revenueTo)
    const minMrr = amountBound(mrrFrom)
    const maxMrr = amountBound(mrrTo)
    const filtered = overview.customers.filter((customer) => {
      if (dateFrom && customer.customerSince < dateFrom) return false
      if (dateTo && customer.customerSince > dateTo) return false
      if (minRevenue != null && customer.value < minRevenue) return false
      if (maxRevenue != null && customer.value > maxRevenue) return false
      if (minMrr != null && customer.mrr < minMrr) return false
      if (maxMrr != null && customer.mrr > maxMrr) return false
      if (
        services.length > 0 &&
        !customer.lines.some((line) => services.some((id) => lineMatchesService(line, id)))
      ) {
        return false
      }
      const needle = query.trim().toLocaleLowerCase("da")
      if (needle) {
        const haystack = [
          customer.name,
          customer.contactName,
          customer.phone,
          customer.email,
          customer.subEmail,
          customer.website,
          customer.cvr,
          ...customer.people.flatMap((person) => [
            person.name,
            person.title,
            ...person.phones.map((entry) => `${entry.label} ${entry.number}`),
            ...person.emails.map((entry) => `${entry.label} ${entry.email}`),
          ]),
          ...customer.lines.map((line) => line.note ?? ""),
        ]
        if (!haystack.some((value) => value.toLocaleLowerCase("da").includes(needle))) return false
      }
      return true
    })
    const factor = direction === "asc" ? 1 : -1
    return filtered.slice().sort((left, right) => {
      const tieBreak = () => left.name.localeCompare(right.name, "da") * factor
      if (sort === "name") return left.name.localeCompare(right.name, "da") * factor
      if (sort === "phone") {
        const diff = phoneSortKey(left.phone).localeCompare(phoneSortKey(right.phone), undefined, {
          numeric: true,
        })
        return (diff || tieBreak()) * factor
      }
      if (sort === "email") {
        const diff = left.email.localeCompare(right.email, "da")
        return (diff || tieBreak()) * factor
      }
      if (sort === "since") return (left.customerSince.localeCompare(right.customerSince) || tieBreak()) * factor
      if (sort === "created") return (left.createdAt.localeCompare(right.createdAt) || tieBreak()) * factor
      if (sort === "services") {
        const diff = customerServices(left.lines).length - customerServices(right.lines).length
        return (diff || tieBreak()) * factor
      }
      if (sort === "mrr" || sort === "value") {
        const diff = left[sort] - right[sort]
        return (diff || tieBreak()) * factor
      }
      return tieBreak()
    })
  }, [overview, services, dateFrom, dateTo, revenueFrom, revenueTo, mrrFrom, mrrTo, query, sort, direction])

  const selected = overview && selectedId ? findCustomer(overview, selectedId) : undefined
  const activeMrr = overview ? activeMonthlyTotal(draft, overview.today) : 0
  const paidToDate = overview ? spentToDate(draft, overview.today) : 0
  const payments = useMemo(
    () => (overview ? paymentMonths(draft, overview.today) : []),
    [draft, overview]
  )

  function openCustomer(customer: InternalCustomer) {
    setSelectedId(customer.workspaceId)
    setDraft(
      customer.lines.map((line) => normalizeDraftLine({ ...line, note: line.note ?? "", billingPeriods: line.billingPeriods ?? [] }))
    )
    setServiceToAdd("")
    setEditingLineId(null)
    setEditingCustomerInfo(false)
    setPeople(peopleFromCustomer(customer))
    setWebsite(customer.website)
    setCvr(customer.cvr)
    setEmail(customer.email)
    setCompanyName(customer.name)
    setFormError(null)
    setDocumentNote("")
    setDocumentError(null)
    setPreviewId(null)
    if (documentFileRef.current) documentFileRef.current.value = ""
  }

  function toggleSort(next: SortKey) {
    if (sort === next) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSort(next)
    setDirection(next === "mrr" || next === "value" ? "desc" : "asc")
  }

  async function save() {
    if (!selected || !overview) return
    setSaving(true)
    setFormError(null)
    try {
      const [linesResponse, contactResponse] = await Promise.all([
        fetch(`/api/admin/commercial/${selected.workspaceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: draft.map((line) => ({ ...line, endsOn: line.endsOn || null })),
          }),
        }),
        fetch(`/api/admin/customers/${selected.workspaceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cvr, companyName, email, website, people }),
        }),
      ])
      const linesPayload = (await linesResponse.json()) as { error?: string }
      const contactPayload = (await contactResponse.json()) as { error?: string }
      if (!linesResponse.ok) {
        setFormError(linesPayload.error || "Kunne ikke gemme services.")
        return
      }
      if (!contactResponse.ok) {
        setFormError(contactPayload.error || "Kunne ikke gemme kontakten.")
        return
      }
      const next = await reload()
      const updated = findCustomer(next, selected.workspaceId)
      setDraft(
        updated?.lines.map((line) =>
          normalizeDraftLine({ ...line, note: line.note ?? "", billingPeriods: line.billingPeriods ?? [] })
        ) ?? []
      )
      setPeople(updated ? peopleFromCustomer(updated) : people)
      setWebsite(updated?.website ?? website)
      setCvr(updated?.cvr ?? cvr)
      setEmail(updated?.email ?? email)
      setCompanyName(updated?.name ?? companyName)
    } catch {
      setFormError("Kunne ikke gemme kunden.")
    } finally {
      setSaving(false)
    }
  }

  async function uploadDocument() {
    if (!selected) return
    const file = documentFileRef.current?.files?.[0]
    if (!file) {
      setDocumentError("Vælg en fil.")
      return
    }
    setUploadingDocument(true)
    setDocumentError(null)
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("note", documentNote)
      const response = await fetch(`/api/admin/customers/${selected.workspaceId}/documents`, {
        method: "POST",
        body,
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setDocumentError(payload.error || "Kunne ikke uploade dokumentet.")
        return
      }
      setDocumentNote("")
      if (documentFileRef.current) documentFileRef.current.value = ""
      await reload()
    } catch {
      setDocumentError("Kunne ikke uploade dokumentet.")
    } finally {
      setUploadingDocument(false)
    }
  }

  async function removeDocument(documentId: string) {
    if (!selected) return
    setDocumentError(null)
    try {
      const response = await fetch(
        `/api/admin/customers/${selected.workspaceId}/documents/${documentId}`,
        { method: "DELETE" }
      )
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setDocumentError(payload.error || "Kunne ikke fjerne dokumentet.")
        return
      }
      if (previewId === documentId) setPreviewId(null)
      await reload()
    } catch {
      setDocumentError("Kunne ikke fjerne dokumentet.")
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!overview) return <p className="text-sm text-muted-foreground">Henter kunder…</p>

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 sm:gap-8">
      <header className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Kunder
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {customers.length} aktive kunder. Klik på en kolonne for at sortere, og på en kunde for kontakt,
              services og kontrakter.
            </p>
          </div>
          <Button type="button" onClick={() => setCreatePipelineOpen(true)}>
            Tilføj ny kunde
          </Button>
        </div>
        <section
          className="grid min-w-0 gap-4 rounded-[16px] border-2 border-[#E4660C]/25 bg-gradient-to-b from-[#E4660C]/6 to-white p-4 sm:p-5"
          aria-label="Kunder der afventer opstart"
        >
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Afventer opstart</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Kunder I skal onboardes eller som starter senere — med forventet MRR, services og manglende cashflow.
            </p>
          </div>
          <InternalPipelineCustomers
            customers={overview.pendingCustomers}
            selectedId={selectedId}
            onSelect={(customer) => openCustomer(pendingAsCustomer(customer))}
          />
        </section>
        <ExpectedCustomerDialog
          open={createPipelineOpen}
          onOpenChange={setCreatePipelineOpen}
          defaultStartsOn={overview.today}
          onCreated={() => {
            void reload()
          }}
        />
        <div className="flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:flex-nowrap xl:items-end">
          <label className="grid min-w-0 flex-1 gap-1.5 text-sm text-[var(--text-secondary)]">
            Søg
            <input
              className="dashboard-chip w-full min-w-0 px-4"
              aria-label="Søg kunder"
              placeholder="Navn, telefon, e-mail, virksomhed eller hjemmeside"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            <span>Dato</span>
            <Popover>
              <PopoverTrigger
                className="dashboard-chip inline-flex w-full max-w-full items-center justify-start gap-2 px-4 text-left xl:w-[13.5rem]"
                aria-label="Kunde siden fra og til"
              >
                <CalendarIcon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {dateFrom && dateTo
                    ? formatDateRangeLabel(
                        new Date(`${dateFrom}T00:00:00`),
                        new Date(`${dateTo}T00:00:00`)
                      )
                    : "Alle datoer"}
                </span>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar
                  mode="range"
                  locale={da}
                  captionLayout="dropdown"
                  startMonth={new Date(Math.min(...overview.years), 0, 1)}
                  endMonth={new Date(Math.max(...overview.years), 11, 31)}
                  labels={{
                    labelMonthDropdown: () => "Vælg måned",
                    labelYearDropdown: () => "Vælg år",
                  }}
                  selected={
                    dateFrom
                      ? {
                          from: new Date(`${dateFrom}T00:00:00`),
                          to: dateTo ? new Date(`${dateTo}T00:00:00`) : undefined,
                        }
                      : undefined
                  }
                  defaultMonth={new Date(`${(dateFrom || overview.today).slice(0, 7)}-01T00:00:00`)}
                  onSelect={(next) => {
                    if (!next?.from || !next.to) return
                    const start = toIso(next.from)
                    const end = toIso(next.to)
                    setDateFrom(start)
                    setDateTo(end < start ? start : end)
                  }}
                />
                {dateFrom || dateTo ? (
                  <button
                    type="button"
                    className="px-2 pb-1 text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                    onClick={() => {
                      setDateFrom("")
                      setDateTo("")
                    }}
                  >
                    Vis alle datoer
                  </button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
          <ServiceSelect
            value={services}
            onChange={setServices}
            className="dashboard-chip w-full justify-between px-4 xl:w-40"
          />
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            <span>Omsætning</span>
            <Popover>
              <PopoverTrigger
                className="dashboard-chip inline-flex w-full max-w-full items-center justify-start px-4 text-left xl:w-36"
                aria-label="Omsætning fra og til"
              >
                <span className="truncate">{amountRangeLabel(revenueFrom, revenueTo)}</span>
              </PopoverTrigger>
              <PopoverContent align="start" className="grid w-72 gap-3 p-3">
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Fra
                  <input
                    inputMode="numeric"
                    className="dashboard-chip w-full px-4"
                    aria-label="Omsætning fra"
                    placeholder="0"
                    value={revenueFrom}
                    onChange={(event) => setRevenueFrom(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Til
                  <input
                    inputMode="numeric"
                    className="dashboard-chip w-full px-4"
                    aria-label="Omsætning til"
                    placeholder="Ingen grænse"
                    value={revenueTo}
                    onChange={(event) => setRevenueTo(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </label>
                {revenueFrom || revenueTo ? (
                  <button
                    type="button"
                    className="text-left text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                    onClick={() => {
                      setRevenueFrom("")
                      setRevenueTo("")
                    }}
                  >
                    Vis alle
                  </button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]">
            <span>MRR</span>
            <Popover>
              <PopoverTrigger
                className="dashboard-chip inline-flex w-full max-w-full items-center justify-start px-4 text-left xl:w-36"
                aria-label="MRR fra og til"
              >
                <span className="truncate">{amountRangeLabel(mrrFrom, mrrTo)}</span>
              </PopoverTrigger>
              <PopoverContent align="start" className="grid w-72 gap-3 p-3">
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Fra
                  <input
                    inputMode="numeric"
                    className="dashboard-chip w-full px-4"
                    aria-label="MRR fra"
                    placeholder="0"
                    value={mrrFrom}
                    onChange={(event) => setMrrFrom(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Til
                  <input
                    inputMode="numeric"
                    className="dashboard-chip w-full px-4"
                    aria-label="MRR til"
                    placeholder="Ingen grænse"
                    value={mrrTo}
                    onChange={(event) => setMrrTo(event.target.value.replace(/[^\d]/g, ""))}
                  />
                </label>
                {mrrFrom || mrrTo ? (
                  <button
                    type="button"
                    className="text-left text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                    onClick={() => {
                      setMrrFrom("")
                      setMrrTo("")
                    }}
                  >
                    Vis alle
                  </button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <Card className="dashboard-card dashboard-monthly-card min-w-0 max-w-full gap-0 overflow-hidden py-0">
        <CardContent className="overflow-x-auto px-0 pb-0">
          <Table className="metric-breakdown-table w-full min-w-[960px] border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.id}
                    className={`h-11 border-b border-r border-white/15 bg-[#3f3a36] px-3 font-medium text-white last:border-r-0 ${
                      column.id === "services" ? "min-w-[11rem]" : ""
                    }`}
                    aria-sort={
                      column.sortable && sort === column.id
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left text-white"
                        onClick={() => toggleSort(column.id)}
                      >
                        {column.label}
                        {sort === column.id ? (direction === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell className="px-6 py-8 text-[var(--text-secondary)]" colSpan={8}>
                    Ingen kunder i det valgte overblik.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  return (
                    <TableRow
                      key={customer.workspaceId}
                      className="cursor-pointer hover:bg-[var(--surface-muted)]"
                      data-state={selectedId === customer.workspaceId ? "selected" : undefined}
                      onClick={() => openCustomer(customer)}
                    >
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3 font-semibold text-[var(--text-primary)]">
                        {customer.name}
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3 tabular-nums">
                        {customer.phone}
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3">
                        {customer.email}
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3">
                        <ServiceIconOverview lines={customer.lines} />
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3 tabular-nums">
                        {formatCustomerDate(customer.customerSince)}
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3 text-right tabular-nums">
                        {formatCurrencyDKK(customer.mrr)}
                      </TableCell>
                      <TableCell className="border-b border-r border-[var(--table-grid)] px-3 py-3 tabular-nums">
                        {formatCustomerDate(customer.createdAt)}
                      </TableCell>
                      <TableCell className="border-b border-[var(--table-grid)] px-3 py-3 text-right tabular-nums">
                        {formatCurrencyDKK(customer.value)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
        {selected ? (
        <DialogContent>
          <div className="relative shrink-0 border-b border-border bg-gradient-to-b from-[#faf9f7] to-white px-5 py-5 sm:px-6">
            <DialogClose
              className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-white/80 text-[var(--text-secondary)] shadow-sm ring-1 ring-border hover:bg-white"
              aria-label="Luk"
            >
              <XIcon className="size-4" />
            </DialogClose>
            <DialogHeader className="gap-2 pr-10">
              <DialogTitle className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {companyName || selected.name}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {selected.status === "awaiting_start"
                  ? "Afventer opstart · "
                  : selected.status === "pending"
                    ? "Skal onboardes · "
                    : ""}
                Oprettet {formatCustomerDate(selected.createdAt)} · Kunde siden{" "}
                {formatCustomerDate(selected.customerSince)}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-6 overflow-y-auto px-5 py-5 sm:px-6">
            <section className="grid gap-4 rounded-[15px] border border-border bg-[var(--surface-muted)]/30 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-[var(--text-primary)]">Kontaktinformation</h3>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                    Virksomhed, hjemmeside, CVR og kontaktpersoner
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-sm font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                  onClick={() => setEditingCustomerInfo((current) => !current)}
                >
                  {editingCustomerInfo ? "Færdig" : "Rediger"}
                </button>
              </div>
              {editingCustomerInfo ? (
                <div className="grid gap-4 border-t border-border pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                      Virksomhedsnavn
                      <input
                        className={onboardingFieldClass}
                        aria-label="Virksomhedsnavn"
                        value={companyName}
                        placeholder="Virksomhedsnavn"
                        onChange={(event) => setCompanyName(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                      Hjemmeside
                      <input
                        className={onboardingFieldClass}
                        aria-label="Hjemmeside"
                        value={website}
                        placeholder="www.firma.dk"
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                      CVR
                      <input
                        className={onboardingFieldClass}
                        aria-label="CVR"
                        inputMode="numeric"
                        value={cvr}
                        placeholder="8 cifre"
                        onChange={(event) => setCvr(event.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                      Hoved-e-mail
                      <input
                        className={onboardingFieldClass}
                        aria-label="Hoved-e-mail"
                        type="email"
                        value={email}
                        placeholder="kontakt@firma.dk"
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>
                  </div>
                  <CustomerPeopleEditor people={people} onChange={setPeople} />
                </div>
              ) : (
                <ul className="grid gap-4 border-t border-border pt-4">
                  <ContactInfoRow
                    icon={Building2Icon}
                    label="Virksomhed"
                    value={companyName || selected.name}
                  />
                  <ContactInfoRow
                    icon={GlobeIcon}
                    label="Hjemmeside"
                    value={website}
                    href={websiteHref(website)}
                  />
                  <ContactInfoRow icon={Building2Icon} label="CVR" value={cvr} />
                  <ContactInfoRow
                    icon={MailIcon}
                    label="Hoved-e-mail"
                    value={email}
                    href={email.trim() ? `mailto:${email.trim()}` : undefined}
                  />
                  {people.map((person, personIndex) => (
                    <li key={person.id} className="grid gap-3 border-t border-border/70 pt-4">
                      <div className="flex items-start gap-3">
                        <UserIcon
                          className="mt-0.5 size-7 shrink-0 text-[#E4660C]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            {people.length > 1 ? `Kontakt ${personIndex + 1}` : "Kontaktperson"}
                          </p>
                          <p className="mt-0.5 text-base font-medium text-[var(--text-primary)]">
                            {person.name.trim() || "—"}
                          </p>
                          {person.title.trim() ? (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                              <BriefcaseIcon className="size-3.5 shrink-0" aria-hidden />
                              {person.title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <ul className="grid gap-3 pl-10">
                        {person.phones.map((entry) => (
                          <ContactInfoRow
                            key={entry.id}
                            icon={PhoneIcon}
                            label={entry.label}
                            value={entry.number}
                            href={
                              entry.number.trim()
                                ? `tel:${entry.number.replace(/\s/g, "")}`
                                : undefined
                            }
                          />
                        ))}
                        {person.emails.map((entry) => (
                          <ContactInfoRow
                            key={entry.id}
                            icon={MailIcon}
                            label={entry.label}
                            value={entry.email}
                            href={entry.email.trim() ? `mailto:${entry.email.trim()}` : undefined}
                          />
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
              <section className="grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-medium text-[var(--text-primary)]">Services</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    I alt{" "}
                    <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatCurrencyDKK(activeMonthlyTotal(draft, overview.today))}
                    </span>{" "}
                    / md.
                  </p>
                </div>
                {draft.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">Ingen services endnu.</p>
                ) : (
                  <div className="overflow-hidden rounded-[12px] border border-border">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(6.5rem,auto)_minmax(4.75rem,auto)_auto] gap-x-3 border-b border-border bg-[var(--surface-muted)]/60 px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] sm:grid-cols-[minmax(0,1fr)_6.5rem_minmax(8.75rem,auto)_4.75rem_auto]">
                      <span>Service</span>
                      <span className="hidden sm:block">Oprettet</span>
                      <span className="whitespace-nowrap text-right">Pris</span>
                      <span className="text-right">Status</span>
                      <span className="w-4" aria-hidden />
                    </div>
                    <ul className="divide-y divide-border">
                      {draft.map((line) => {
                        const { label } = serviceVisual(line)
                        const active = serviceIsActive(line, overview.today)
                        const editing = editingLineId === line.id
                        const currentPrice = commercialCurrentAmount(line, new Date(`${overview.today}T00:00:00`))
                        const priceLabel =
                          line.cadence === "monthly"
                            ? `${formatCurrencyDKK(currentPrice)}\u00a0/ md.`
                            : formatCurrencyDKK(line.amount)
                        return (
                          <li key={line.id} className={editing ? "bg-[var(--surface-muted)]/30" : undefined}>
                            <button
                              type="button"
                              className="grid w-full grid-cols-[minmax(0,1fr)_minmax(6.5rem,auto)_minmax(4.75rem,auto)_auto] items-center gap-x-3 px-3 py-2.5 text-left text-sm sm:grid-cols-[minmax(0,1fr)_6.5rem_minmax(8.75rem,auto)_4.75rem_auto]"
                              aria-expanded={editing}
                              onClick={() => setEditingLineId(editing ? null : line.id)}
                            >
                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <ServiceLineIcon line={line} />
                                  <span className="truncate font-medium text-[var(--text-primary)]">{label}</span>
                                </span>
                                <span className="mt-0.5 block truncate pl-7 text-xs text-[var(--text-secondary)] sm:hidden">
                                  Oprettet {formatCustomerDate(line.startsOn)}
                                </span>
                              </span>
                              <span className="hidden truncate text-xs text-[var(--text-secondary)] sm:block">
                                {formatCustomerDate(line.startsOn)}
                              </span>
                              <span className="whitespace-nowrap text-right text-sm tabular-nums text-[var(--text-primary)]">
                                {priceLabel}
                              </span>
                              <span
                                className={`text-right text-xs font-medium ${
                                  active ? "text-[#1f8a62]" : "text-[var(--text-secondary)]"
                                }`}
                              >
                                {active ? "Aktiv" : "Deaktiveret"}
                              </span>
                              <ChevronDownIcon
                                className={`size-4 shrink-0 text-[var(--text-secondary)] transition-transform ${
                                  editing ? "rotate-180" : ""
                                }`}
                                aria-hidden
                              />
                            </button>
                            {editing ? (
                              <div className="grid gap-3 border-t border-border bg-[var(--surface-muted)]/40 px-3 py-3 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                                  Aftale start
                                  <input
                                    className={onboardingFieldClass}
                                    type="date"
                                    value={line.startsOn}
                                    aria-label={`Start for ${label}`}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        patchLine(current, line.id, { startsOn: event.target.value })
                                      )
                                    }
                                  />
                                </label>
                                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                                  Aftale slut
                                  <input
                                    className={onboardingFieldClass}
                                    type="date"
                                    value={line.endsOn ?? ""}
                                    aria-label={`Slut for ${label}`}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        patchLine(current, line.id, { endsOn: event.target.value || null })
                                      )
                                    }
                                  />
                                </label>
                                {line.cadence === "monthly" ? (
                                  <CommercialBillingPeriodsEditor
                                    line={line}
                                    onChange={(patch) =>
                                      setDraft((current) => patchLine(current, line.id, patch))
                                    }
                                  />
                                ) : (
                                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                                    Engangsbeløb
                                    <input
                                      className={`${onboardingFieldClass} w-full tabular-nums sm:max-w-[10rem]`}
                                      inputMode="numeric"
                                      value={line.amount ? String(line.amount) : ""}
                                      aria-label={`Pris for ${label}`}
                                      onChange={(event) => {
                                        const next = Number(event.target.value.replace(/[^\d]/g, "") || 0)
                                        setDraft((current) => patchLine(current, line.id, { amount: next }))
                                      }}
                                    />
                                  </label>
                                )}
                                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                                  <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                    <input
                                      type="checkbox"
                                      checked={active}
                                      aria-label={`Aktiv for ${label}`}
                                      onChange={(event) =>
                                        setDraft((current) =>
                                          patchLine(current, line.id, {
                                            endsOn: event.target.checked ? null : dayBefore(overview.today),
                                          })
                                        )
                                      }
                                    />
                                    Aktiv
                                  </label>
                                  <button
                                    type="button"
                                    className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                                    onClick={() => {
                                      setDraft((current) => current.filter((item) => item.id !== line.id))
                                      setEditingLineId(null)
                                    }}
                                  >
                                    Fjern service
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2 rounded-[12px] border border-dashed border-border p-3">
                  <label className="grid min-w-[10rem] flex-1 gap-1.5 text-sm text-[var(--text-secondary)]">
                    Ny service
                    <select
                      className={onboardingFieldClass}
                      aria-label="Tilføj service"
                      value={serviceToAdd}
                      onChange={(event) => {
                        const next = event.target.value as ServiceId | ""
                        setServiceToAdd(next)
                        if (next) {
                          setNewServiceAmount(String(SERVICE_DEFAULT_AMOUNTS[next] ?? 0))
                        } else {
                          setNewServiceAmount("")
                        }
                      }}
                    >
                      <option value="">Vælg service</option>
                      {CENSIO_SERVICES.filter(
                        (service) => !draft.some((line) => serviceForLine(line) === service.id)
                      ).map((service) => (
                        <option key={service.id} value={service.id}>
                          {SERVICE_LABELS[service.id]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    Pris pr. md.
                    <input
                      className={`${onboardingFieldClass} w-28 tabular-nums`}
                      inputMode="numeric"
                      value={newServiceAmount}
                      placeholder="0"
                      aria-label="Pris for ny service"
                      onChange={(event) => setNewServiceAmount(event.target.value.replace(/[^\d]/g, ""))}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!serviceToAdd}
                    onClick={() => {
                      if (!serviceToAdd) return
                      const amount = Number(newServiceAmount || 0)
                      const line = createServiceLine(
                        serviceToAdd,
                        selected.workspaceId,
                        overview.today,
                        amount
                      )
                      setDraft((current) => [...current, normalizeDraftLine(line)])
                      setServiceToAdd("")
                      setNewServiceAmount("")
                    }}
                  >
                    Tilføj
                  </Button>
                </div>
              </section>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? "Gemmer…" : "Gem kunde"}
                </Button>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              </div>
            <section className="grid gap-3 rounded-[15px] border border-border p-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Dokumenter</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Kontrakter og andre aftaler</p>
              </div>
              {selected.documents.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Ingen dokumenter endnu.</p>
              ) : (
                <ul className="grid gap-2">
                  {[...selected.documents]
                    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
                    .map((document) => {
                      const previewUrl = `/api/admin/customers/${selected.workspaceId}/documents/${document.id}`
                      const isPdf = document.storedName.endsWith(".pdf")
                      const isImage = /\.(png|jpe?g|webp)$/i.test(document.storedName)
                      const open = previewId === document.id
                      return (
                        <li key={document.id} className="grid gap-3 rounded-[15px] border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{document.fileName}</p>
                              {document.note ? (
                                <p className="mt-1 text-sm text-[var(--text-primary)]">{document.note}</p>
                              ) : null}
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {formatCustomerDate(document.uploadedAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {isPdf || isImage ? (
                                <button
                                  type="button"
                                  className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                                  onClick={() => setPreviewId(open ? null : document.id)}
                                >
                                  {open ? "Luk preview" : "Preview"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                                onClick={() => void removeDocument(document.id)}
                              >
                                Fjern
                              </button>
                            </div>
                          </div>
                          {open && isPdf ? (
                            <iframe
                              className="h-[28rem] w-full rounded-[12px] border border-border bg-white"
                              src={previewUrl}
                              title={document.fileName}
                            />
                          ) : null}
                          {open && isImage ? (
                            <img
                              className="max-h-[28rem] w-full rounded-[12px] border border-border object-contain"
                              src={previewUrl}
                              alt={document.note || document.fileName}
                            />
                          ) : null}
                        </li>
                      )
                    })}
                </ul>
              )}
              <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_16rem_auto] sm:items-end">
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Fil
                  <input
                    ref={documentFileRef}
                    className="text-sm text-[var(--text-primary)] file:mr-3 file:rounded-full file:border-0 file:bg-[#141414]/5 file:px-3 file:py-2 file:text-sm file:text-[var(--text-primary)]"
                    aria-label="Upload dokument"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  Note
                  <input
                    className={onboardingFieldClass}
                    aria-label="Note til dokument"
                    value={documentNote}
                    placeholder="Kort note"
                    onChange={(event) => setDocumentNote(event.target.value)}
                  />
                </label>
                <Button type="button" variant="outline" disabled={uploadingDocument} onClick={() => void uploadDocument()}>
                  {uploadingDocument ? "Uploader…" : "Upload"}
                </Button>
              </div>
              {documentError ? <p className="text-sm text-destructive">{documentError}</p> : null}
            </section>
            <section className="grid gap-4 rounded-[15px] border border-border p-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-center">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Cashflow</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Betaling pr. måned</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Aktiv MRR</p>
                  <p className="mt-1 text-2xl font-medium tabular-nums">{formatCurrencyDKK(activeMrr)}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Betalt i alt</p>
                  <p className="mt-1 text-2xl font-medium tabular-nums">{formatCurrencyDKK(paidToDate)}</p>
                </div>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Ingen betalinger endnu.</p>
              ) : (
                <div className="h-56 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payments} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="customerCashflowFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CASHFLOW} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={CASHFLOW} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical horizontal />
                      <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        tickSize={6}
                        tickMargin={8}
                        padding={{ left: 8, right: 8 }}
                        tickLine={{ stroke: "var(--border)" }}
                        axisLine={{ stroke: "var(--border)" }}
                        tick={{
                          fill: "var(--text-muted)",
                          fontSize: 12,
                          fontFamily: "var(--font-outfit), Outfit, sans-serif",
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={72}
                        tick={{
                          fill: "var(--text-muted)",
                          fontSize: 12,
                          fontFamily: "var(--font-outfit), Outfit, sans-serif",
                        }}
                        tickFormatter={(value: number) => formatAxisValue(value, "currency")}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--border)" }}
                        formatter={(value) => formatCurrencyDKK(Number(value))}
                        labelFormatter={(label) => String(label)}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Betaling"
                        stroke={CASHFLOW}
                        fill="url(#customerCashflowFill)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: CASHFLOW, stroke: CASHFLOW }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>
        </DialogContent>
        ) : null}
      </Dialog>

    </div>
  )
}
