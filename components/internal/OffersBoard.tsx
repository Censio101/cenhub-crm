"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { loadInternalOverview } from "@/components/internal/overview"
import { OfferContentTags } from "@/components/internal/OfferContentTags"
import { OfferCreateDialog } from "@/components/internal/OfferCreateDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OfferEngagementSummary } from "@/lib/internal/offer-engagement"
import { filterOffersByQuery, partitionOffers } from "@/lib/internal/offer-admin"
import {
  defaultPublicPackageView,
  movePackageInOrder,
  normalizeOfferPackages,
  type OfferPackageId,
  type OfferPublicPackageView,
} from "@/lib/internal/offer-packages"
import { OFFER_FULL_GROWTH_PRESET } from "@/lib/internal/offers"
import type { Offer, OfferServiceId } from "@/lib/onboarding/types"

const searchClass =
  "h-10 w-full max-w-md rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type CustomerOption = {
  workspaceId: string
  name: string
  email: string
  contactName: string
  cvr: string
  phone: string
}

type AdminOffer = Offer & {
  summary?: string
  engagement?: OfferEngagementSummary
}

function formatOfferDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, "d. MMM yyyy", { locale: da })
}

function offerPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/tilbud/${slug}`
  return `${window.location.origin}/tilbud/${slug}`
}

function engagementLabel(summary: OfferEngagementSummary | undefined) {
  if (!summary || summary.sessions === 0) return "Ikke åbnet endnu"
  return `Åbnet ${summary.opened} gang${summary.opened === 1 ? "" : "e"} · Scroll ${summary.maxScrollPct}% · ${summary.totalReadSec} sek.`
}

function acceptedLabel(offer: AdminOffer) {
  if (!offer.acceptedAt) return ","
  const when = formatOfferDate(offer.acceptedAt)
  if (offer.acceptedVia === "customer" && offer.signatureName) {
    return `${when} · ${offer.signatureName}`
  }
  if (offer.acceptedVia === "admin") return `${when} · Censio`
  return when
}

export function OffersBoard() {
  const [offers, setOffers] = useState<AdminOffer[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [cvr, setCvr] = useState("")
  const [packages, setPackages] = useState<OfferPackageId[]>(["vaekstpakke"])
  const [publicPackageView, setPublicPackageView] = useState<OfferPublicPackageView>("vaekst")
  const [services, setServices] = useState<OfferServiceId[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [draftQuery, setDraftQuery] = useState("")
  const [sentQuery, setSentQuery] = useState("")
  const [acceptedQuery, setAcceptedQuery] = useState("")

  async function reload() {
    const response = await fetch("/api/admin/offers")
    const payload = (await response.json()) as { offers?: AdminOffer[]; error?: string }
    if (!response.ok) throw new Error(payload.error || "Kunne ikke hente tilbud.")
    setOffers(payload.offers ?? [])
  }

  useEffect(() => {
    void (async () => {
      try {
        const [offerResponse, overview] = await Promise.all([
          fetch("/api/admin/offers"),
          loadInternalOverview(),
        ])
        const offerPayload = (await offerResponse.json()) as { offers?: AdminOffer[]; error?: string }
        if (!offerResponse.ok) throw new Error(offerPayload.error || "Kunne ikke hente tilbud.")
        setOffers(offerPayload.offers ?? [])
        setCustomers(
          overview.customers
            .map((customer) => ({
              workspaceId: customer.workspaceId,
              name: customer.name,
              email: customer.email,
              contactName: customer.contactName,
              cvr: customer.cvr,
              phone: customer.phone,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "da"))
        )
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : "Kunne ikke hente tilbud.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const { drafts, sent, accepted } = useMemo(() => partitionOffers(offers), [offers])

  const filteredDrafts = useMemo(
    () => filterOffersByQuery(drafts, draftQuery),
    [drafts, draftQuery]
  )
  const filteredSent = useMemo(() => filterOffersByQuery(sent, sentQuery), [sent, sentQuery])
  const filteredAccepted = useMemo(
    () => filterOffersByQuery(accepted, acceptedQuery),
    [accepted, acceptedQuery]
  )

  function resetForm() {
    setWorkspaceId("")
    setCompanyName("")
    setContactName("")
    setEmail("")
    setPhone("")
    setCvr("")
    setPackages(["vaekstpakke"])
    setPublicPackageView("vaekst")
    setServices([])
    setFormError(null)
    setCreateStep(1)
  }

  function openCreate() {
    setEditingId(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(offer: AdminOffer) {
    setCreateStep(1)
    setEditingId(offer.id)
    setWorkspaceId(offer.workspaceId ?? "")
    setCompanyName(offer.companyName)
    setContactName(offer.contactName)
    setEmail(offer.email)
    setPhone(offer.phone ?? "")
    setCvr(offer.cvr)
    setPackages(normalizeOfferPackages(offer.packages))
    setPublicPackageView(offer.publicPackageView)
    setServices(offer.services)
    setFormError(null)
    setDialogOpen(true)
  }

  function applyCustomer(customer: CustomerOption) {
    setWorkspaceId(customer.workspaceId)
    setCompanyName(customer.name)
    setContactName(customer.contactName || customer.name)
    setEmail(customer.email)
    setCvr(customer.cvr)
    setPhone(customer.phone)
  }

  function togglePackage(id: OfferPackageId) {
    setPackages((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      if (next.length > 0) {
        setPublicPackageView(defaultPublicPackageView(next))
      }
      return next
    })
  }

  function movePackage(id: OfferPackageId, direction: "up" | "down") {
    setPackages((current) => {
      const next = movePackageInOrder(current, id, direction)
      if (next.length > 0) {
        setPublicPackageView(defaultPublicPackageView(next))
      }
      return next
    })
  }

  function goToCreateStep2() {
    setFormError(null)
    if (!companyName.trim()) {
      setFormError("Skriv et virksomhedsnavn.")
      return
    }
    if (!contactName.trim()) {
      setFormError("Skriv navn på kunden.")
      return
    }
    if (!email.includes("@")) {
      setFormError("Skriv en gyldig e-mail.")
      return
    }
    const digits = cvr.replace(/[^\d]/g, "")
    if (digits && digits.length !== 8) {
      setFormError("CVR skal være 8 cifre.")
      return
    }
    setPublicPackageView(defaultPublicPackageView(packages))
    setCreateStep(2)
  }

  function toggleService(id: OfferServiceId) {
    setServices((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function applyFullGrowthPreset() {
    setPackages([...OFFER_FULL_GROWTH_PRESET.packages])
    setPublicPackageView(OFFER_FULL_GROWTH_PRESET.publicPackageView)
    setServices([...OFFER_FULL_GROWTH_PRESET.services])
  }

  async function saveOffer() {
    setSaving(true)
    setFormError(null)
    const body = {
      workspaceId: workspaceId || null,
      companyName,
      contactName,
      email,
      phone,
      cvr,
      packages,
      publicPackageView,
      services,
    }
    try {
      const response = await fetch(editingId ? `/api/admin/offers/${editingId}` : "/api/admin/offers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setFormError(payload.error || "Tilbuddet kunne ikke gemmes.")
        return
      }
      await reload()
      setDialogOpen(false)
      setCreateStep(1)
    } catch {
      setFormError("Tilbuddet kunne ikke gemmes.")
    } finally {
      setSaving(false)
    }
  }

  async function patchStatus(offer: AdminOffer, status: "sent" | "accepted") {
    setError(null)
    const response = await fetch(`/api/admin/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const payload = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(payload.error || "Tilbuddet kunne ikke opdateres.")
      return
    }
    await reload()
  }

  async function copyLink(slug: string) {
    const url = offerPublicUrl(slug)
    await navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    window.setTimeout(() => setCopiedSlug(null), 2000)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Henter tilbud…</p>
  if (error && offers.length === 0) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 sm:gap-8">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">Tilbud</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Overblik over udkast, sendte og accepterede tilbud. Søg og klik på kolonner for at sortere.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Nyt tilbud
        </Button>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--text-secondary)]">Udkast</p>
            <p className="mt-1 text-3xl font-medium tabular-nums text-[var(--text-primary)]">{drafts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--text-secondary)]">Sendt</p>
            <p className="mt-1 text-3xl font-medium tabular-nums text-[var(--text-primary)]">{sent.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--text-secondary)]">Accepteret</p>
            <p className="mt-1 text-3xl font-medium tabular-nums text-[var(--text-primary)]">{accepted.length}</p>
          </CardContent>
        </Card>
      </div>

      <OfferTableSection
        id="drafts"
        title="Tilbud i udkast"
        count={drafts.length}
        empty="Ingen udkast endnu."
        offers={filteredDrafts}
        query={draftQuery}
        onQueryChange={setDraftQuery}
        dateLabel={(offer) => `Oprettet ${formatOfferDate(offer.createdAt)}`}
        dateSortIso={(offer) => offer.createdAt}
        copiedSlug={copiedSlug}
        onCopy={copyLink}
        onEdit={openEdit}
        onSend={(offer) => void patchStatus(offer, "sent")}
      />

      <OfferTableSection
        id="sent"
        title="Tilbud sendt"
        count={sent.length}
        empty="Ingen sendte tilbud endnu."
        offers={filteredSent}
        query={sentQuery}
        onQueryChange={setSentQuery}
        dateLabel={(offer) => `Sendt ${formatOfferDate(offer.sentAt ?? offer.updatedAt)}`}
        dateSortIso={(offer) => offer.sentAt ?? offer.updatedAt}
        copiedSlug={copiedSlug}
        onCopy={copyLink}
        showEngagement
        onAccept={(offer) => void patchStatus(offer, "accepted")}
      />

      <OfferTableSection
        id="accepted"
        title="Tilbud sendt og accepteret"
        count={accepted.length}
        empty="Ingen accepterede tilbud endnu."
        offers={filteredAccepted}
        query={acceptedQuery}
        onQueryChange={setAcceptedQuery}
        dateLabel={acceptedLabel}
        dateSortIso={(offer) => offer.acceptedAt ?? offer.updatedAt}
        copiedSlug={copiedSlug}
        onCopy={copyLink}
      />

      <OfferCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        step={createStep}
        onStepChange={setCreateStep}
        customers={customers}
        workspaceId={workspaceId}
        onWorkspaceIdChange={setWorkspaceId}
        onApplyCustomer={applyCustomer}
        companyName={companyName}
        onCompanyNameChange={setCompanyName}
        cvr={cvr}
        onCvrChange={setCvr}
        contactName={contactName}
        onContactNameChange={setContactName}
        email={email}
        onEmailChange={setEmail}
        phone={phone}
        onPhoneChange={setPhone}
        packages={packages}
        onTogglePackage={togglePackage}
        onMovePackage={movePackage}
        publicPackageView={publicPackageView}
        onPublicPackageViewChange={setPublicPackageView}
        services={services}
        onToggleService={toggleService}
        onApplyFullGrowthPreset={applyFullGrowthPreset}
        formError={formError}
        saving={saving}
        onGoToStep2={goToCreateStep2}
        onSave={() => void saveOffer()}
      />
    </div>
  )
}

type OfferSortKey = "companyName" | "contactName" | "email" | "cvr" | "date"
type OfferSortDirection = "asc" | "desc"

function sortOffers(
  offers: AdminOffer[],
  sort: OfferSortKey,
  direction: OfferSortDirection,
  dateSortIso: (offer: AdminOffer) => string
) {
  const factor = direction === "asc" ? 1 : -1
  return offers.slice().sort((left, right) => {
    let diff = 0
    if (sort === "date") {
      diff = dateSortIso(left).localeCompare(dateSortIso(right))
    } else if (sort === "cvr") {
      diff = (left.cvr || "").localeCompare(right.cvr || "", "da")
    } else {
      diff = left[sort].localeCompare(right[sort], "da", { sensitivity: "base" })
    }
    return (diff || left.companyName.localeCompare(right.companyName, "da")) * factor
  })
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: OfferSortDirection
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-0.5 font-medium hover:text-[var(--text-primary)]"
      onClick={onClick}
    >
      {label}
      {active ? <span aria-hidden>{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  )
}

function OfferTableSection({
  id,
  title,
  count,
  empty,
  offers,
  query,
  onQueryChange,
  dateLabel,
  dateSortIso,
  copiedSlug,
  onCopy,
  onEdit,
  onSend,
  onAccept,
  showEngagement,
}: {
  id: string
  title: string
  count: number
  empty: string
  offers: AdminOffer[]
  query: string
  onQueryChange: (value: string) => void
  dateLabel: (offer: AdminOffer) => string
  dateSortIso: (offer: AdminOffer) => string
  copiedSlug: string | null
  onCopy: (slug: string) => void
  onEdit?: (offer: AdminOffer) => void
  onSend?: (offer: AdminOffer) => void
  onAccept?: (offer: AdminOffer) => void
  showEngagement?: boolean
}) {
  const [sort, setSort] = useState<OfferSortKey>("date")
  const [direction, setDirection] = useState<OfferSortDirection>("desc")

  function toggleSort(next: OfferSortKey) {
    if (sort === next) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSort(next)
    setDirection(next === "date" ? "desc" : "asc")
  }

  const sortedOffers = useMemo(
    () => sortOffers(offers, sort, direction, dateSortIso),
    [offers, sort, direction, dateSortIso]
  )

  function head(
    column: OfferSortKey,
    label: string,
    className?: string
  ): ReactNode {
    const active = sort === column
    return (
      <TableHead
        className={className}
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
      >
        <SortableHead label={label} active={active} direction={direction} onClick={() => toggleSort(column)} />
      </TableHead>
    )
  }

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby={`${id}-heading`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id={`${id}-heading`} className="text-lg font-medium text-[var(--text-primary)]">
          {title}
          <span className="ml-2 text-base font-normal tabular-nums text-[var(--text-secondary)]">({count})</span>
        </h2>
        <label className="grid w-full min-w-0 gap-1 sm:max-w-md">
          <span className="sr-only">Søg i {title.toLowerCase()}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Søg navn, CVR, virksomhed, telefon, e-mail…"
            className={searchClass}
          />
        </label>
      </div>
      {offers.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-[15px] border border-border bg-white">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                {head("companyName", "Virksomhedsnavn")}
                {head("contactName", "Kontaktperson")}
                <TableHead>Telefon</TableHead>
                {head("email", "Email")}
                {head("cvr", "CVR")}
                <TableHead>Indhold / service</TableHead>
                {head("date", "Dato")}
                <TableHead className="text-right">Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="min-w-[9rem] max-w-[12rem] font-medium">{offer.companyName}</TableCell>
                  <TableCell className="min-w-[7rem] max-w-[10rem]">{offer.contactName || ","}</TableCell>
                  <TableCell className="min-w-[6rem] whitespace-nowrap">{offer.phone || ","}</TableCell>
                  <TableCell className="min-w-[9rem] max-w-[12rem] truncate">{offer.email}</TableCell>
                  <TableCell className="min-w-[5rem] whitespace-nowrap">{offer.cvr || ","}</TableCell>
                  <TableCell className="min-w-[10rem]">
                    <OfferContentTags offer={offer} />
                  </TableCell>
                  <TableCell className="min-w-[8rem] max-w-[13rem] text-sm text-[var(--text-secondary)]">
                    <span className="block">{dateLabel(offer)}</span>
                    {showEngagement ? (
                      <span className="mt-0.5 block text-xs">{engagementLabel(offer.engagement)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                        onClick={() => onCopy(offer.slug)}
                      >
                        {copiedSlug === offer.slug ? "Link kopieret" : "Kopiér link"}
                      </button>
                      {onEdit && onSend ? (
                        <>
                          <button
                            type="button"
                            className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
                            onClick={() => onEdit(offer)}
                          >
                            Ret
                          </button>
                          <button
                            type="button"
                            className="text-sm font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                            onClick={() => onSend(offer)}
                          >
                            Marker som sendt
                          </button>
                        </>
                      ) : null}
                      {onAccept ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                          onClick={() => onAccept(offer)}
                        >
                          Marker som accepteret
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
