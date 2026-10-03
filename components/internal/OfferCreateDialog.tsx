"use client"

import { XIcon } from "lucide-react"

import { OfferPackageCard } from "@/components/internal/OfferPackageCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  OFFER_PACKAGES,
  type OfferPackageId,
  type OfferPublicPackageView,
} from "@/lib/internal/offer-packages"
import { OFFER_SERVICE_MARKS } from "@/lib/internal/offer-service-marks"
import { OFFER_SERVICE_IDS, OFFER_SERVICE_LABELS } from "@/lib/internal/offers"
import type { OfferServiceId } from "@/lib/onboarding/types"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

const CATALOG_PACKAGE = OFFER_PACKAGES[0]!

type CustomerOption = {
  workspaceId: string
  name: string
  email: string
  contactName: string
  cvr: string
  phone: string
}

type OfferCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  step: 1 | 2
  onStepChange: (step: 1 | 2) => void
  customers: CustomerOption[]
  workspaceId: string
  onWorkspaceIdChange: (value: string) => void
  onApplyCustomer: (customer: CustomerOption) => void
  companyName: string
  onCompanyNameChange: (value: string) => void
  cvr: string
  onCvrChange: (value: string) => void
  contactName: string
  onContactNameChange: (value: string) => void
  email: string
  onEmailChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  packages: OfferPackageId[]
  onTogglePackage: (id: OfferPackageId) => void
  onMovePackage: (id: OfferPackageId, direction: "up" | "down") => void
  publicPackageView: OfferPublicPackageView
  onPublicPackageViewChange: (value: OfferPublicPackageView) => void
  services: OfferServiceId[]
  onToggleService: (id: OfferServiceId) => void
  onApplyFullGrowthPreset: () => void
  formError: string | null
  saving: boolean
  onGoToStep2: () => void
  onSave: () => void
}

export function OfferCreateDialog(props: OfferCreateDialogProps) {
  const {
    open,
    onOpenChange,
    editingId,
    step,
    onStepChange,
    customers,
    workspaceId,
    onWorkspaceIdChange,
    onApplyCustomer,
    companyName,
    onCompanyNameChange,
    cvr,
    onCvrChange,
    contactName,
    onContactNameChange,
    email,
    onEmailChange,
    phone,
    onPhoneChange,
    services,
    onToggleService,
    onApplyFullGrowthPreset,
    formError,
    saving,
    onGoToStep2,
    onSave,
  } = props

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) onStepChange(1)
      }}
    >
      <DialogContent className="w-[min(44rem,calc(100vw-2rem))]">
        <div className="relative shrink-0 border-b border-border px-5 py-5 sm:px-6">
          <DialogClose
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            aria-label="Luk"
          >
            <XIcon className="size-4" />
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{editingId ? "Ret udkast" : "Nyt tilbud"}</DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Kundeoplysninger, derefter vækstpakke og valgfrie tillæg."
                : "Vækst pakke (20.500 kr) og valgfrie tillæg til tilbudssiden."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {step === 1 ? (
          <div className="grid max-h-[min(70vh,40rem)] gap-5 overflow-y-auto px-5 py-5 sm:px-6">
            <p className="text-sm font-medium text-[var(--text-primary)]">Trin 1, Kunde</p>

            {customers.length > 0 ? (
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Hent fra eksisterende kunde (valgfrit)
                <select
                  value={workspaceId}
                  onChange={(event) => {
                    const id = event.target.value
                    onWorkspaceIdChange(id)
                    const customer = customers.find((item) => item.workspaceId === id)
                    if (customer) onApplyCustomer(customer)
                  }}
                  className={fieldClass}
                >
                  <option value="">Vælg kunde…</option>
                  {customers.map((customer) => (
                    <option key={customer.workspaceId} value={customer.workspaceId}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                Virksomhedsnavn
                <input
                  required
                  value={companyName}
                  onChange={(event) => onCompanyNameChange(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                CVR (valgfrit)
                <input
                  value={cvr}
                  inputMode="numeric"
                  onChange={(event) => onCvrChange(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Navn på kunde
                <input
                  required
                  value={contactName}
                  onChange={(event) => onContactNameChange(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                E-mail
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
                Telefon (valgfrit)
                <input
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(event) => onPhoneChange(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onGoToStep2}>
                Næste, indhold og tillæg
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid max-h-[min(70vh,40rem)] gap-5 overflow-y-auto px-5 py-5 sm:px-6">
            <p className="text-sm font-medium text-[var(--text-primary)]">Trin 2, Vækstpakke & tillæg</p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-[#E4660C]/40 bg-[#E4660C]/5 px-3 py-1.5 text-sm font-medium text-[#833b08] hover:bg-[#E4660C]/10"
                onClick={onApplyFullGrowthPreset}
              >
                Fuldt vækst-system
              </button>
            </div>

            <div className="grid gap-2">
              <p className="text-sm text-[var(--text-secondary)]">Pakke i tilbuddet</p>
              <OfferPackageCard pkg={CATALOG_PACKAGE} selected onToggle={() => {}} />
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm text-[var(--text-secondary)]">Tillæg (valgfrit)</legend>
              <div className="flex flex-wrap gap-2">
                {OFFER_SERVICE_IDS.map((id) => {
                  const mark = OFFER_SERVICE_MARKS[id]
                  const Icon = mark.icon
                  const selected = services.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleService(id)}
                      className={`inline-flex w-[4.75rem] flex-col items-center gap-1 rounded-[15px] border px-2 py-2 text-center ${
                        selected ? "border-[#E4660C] bg-[#E4660C]/5" : "border-border bg-white"
                      }`}
                    >
                      <Icon className="size-5 shrink-0" style={{ color: mark.color }} aria-hidden />
                      <span className="text-[11px] leading-tight font-medium text-[var(--text-primary)]">
                        {OFFER_SERVICE_LABELS[id]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onStepChange(1)}>
                Tilbage
              </Button>
              <Button type="button" disabled={saving} onClick={onSave}>
                {saving ? "Gemmer…" : "Gem udkast"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
