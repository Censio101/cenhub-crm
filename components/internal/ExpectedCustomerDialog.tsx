"use client"

import { useEffect, useMemo, useState } from "react"

import { CustomerPeopleEditor } from "@/components/internal/CustomerPeopleEditor"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { onboardingFieldClass } from "@/components/onboarding/field"
import { emptyPerson } from "@/lib/internal/customer-contact"
import { CENSIO_SERVICES, type ServiceId } from "@/lib/internal/services"
import type { CustomerPerson } from "@/lib/onboarding/types"

const DEFAULT_AMOUNTS: Partial<Record<ServiceId, number>> = {
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

type DraftService = {
  serviceId: ServiceId
  amount: string
}

type ExpectedCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStartsOn: string
  onCreated: () => void | Promise<void>
}

export function ExpectedCustomerDialog({
  open,
  onOpenChange,
  defaultStartsOn,
  onCreated,
}: ExpectedCustomerDialogProps) {
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [cvr, setCvr] = useState("")
  const [email, setEmail] = useState("")
  const [people, setPeople] = useState<CustomerPerson[]>([emptyPerson()])
  const [startsOn, setStartsOn] = useState(defaultStartsOn)
  const [pickService, setPickService] = useState<ServiceId | "">("")
  const [services, setServices] = useState<DraftService[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setStartsOn(defaultStartsOn)
  }, [open, defaultStartsOn])

  const usedIds = useMemo(() => new Set(services.map((item) => item.serviceId)), [services])

  function reset() {
    setCompanyName("")
    setWebsite("")
    setCvr("")
    setEmail("")
    setPeople([emptyPerson()])
    setStartsOn(defaultStartsOn)
    setPickService("")
    setServices([])
    setError(null)
  }

  function addService() {
    if (!pickService || usedIds.has(pickService)) return
    setServices((current) => [
      ...current,
      { serviceId: pickService, amount: String(DEFAULT_AMOUNTS[pickService] ?? 0) },
    ])
    setPickService("")
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/customers/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          email,
          website,
          cvr,
          people,
          startsOn,
          services: services.map((item) => ({
            serviceId: item.serviceId,
            amount: Number(item.amount.replace(/[^\d]/g, "") || 0),
          })),
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Kunne ikke oprette kunden.")
        return
      }
      reset()
      onOpenChange(false)
      await onCreated()
    } catch {
      setError("Kunne ikke oprette kunden.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b border-border/80 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>Tilføj ny kunde</DialogTitle>
            <DialogDescription>
              Opret kunden med samme kontaktinformation som i kundekortet. Angiv opstart og services, så kunden
              vises under Afventer opstart, indtil I onboarder.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
              Virksomhedsnavn
              <input
                className={onboardingFieldClass}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
              Hjemmeside
              <input
                className={onboardingFieldClass}
                value={website}
                placeholder="www.firma.dk"
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
              CVR
              <input
                className={onboardingFieldClass}
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
                type="email"
                value={email}
                placeholder="kontakt@firma.dk"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2">
              Forventet opstart
              <input
                className={onboardingFieldClass}
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </label>
          </div>
          <CustomerPeopleEditor people={people} onChange={setPeople} />
          <div className="grid gap-4 rounded-[14px] border border-dashed border-border bg-[var(--surface-muted)]/25 px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-sm font-medium text-[var(--text-primary)]">Services og pris pr. md.</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-[10rem] flex-1 gap-1 text-sm text-[var(--text-secondary)]">
                Service
                <select
                  className={onboardingFieldClass}
                  value={pickService}
                  onChange={(event) => setPickService(event.target.value as ServiceId | "")}
                >
                  <option value="">Vælg service</option>
                  {CENSIO_SERVICES.filter((service) => !usedIds.has(service.id)).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" variant="outline" disabled={!pickService} onClick={addService}>
                Tilføj
              </Button>
            </div>
            {services.length === 0 ? (
              <p className="pt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                Vælg mindst én service.
              </p>
            ) : (
              <ul className="grid gap-3 pt-1">
                {services.map((item) => {
                  const label = CENSIO_SERVICES.find((service) => service.id === item.serviceId)?.label
                  return (
                    <li key={item.serviceId} className="flex flex-wrap items-end gap-2">
                      <span className="min-w-[6rem] flex-1 text-sm font-medium text-[var(--text-primary)]">
                        {label}
                      </span>
                      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">
                        Pris / md.
                        <input
                          className={`${onboardingFieldClass} w-28 tabular-nums`}
                          inputMode="numeric"
                          value={item.amount}
                          onChange={(event) =>
                            setServices((current) =>
                              current.map((row) =>
                                row.serviceId === item.serviceId
                                  ? { ...row, amount: event.target.value.replace(/[^\d]/g, "") }
                                  : row
                              )
                            )
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setServices((current) =>
                            current.filter((row) => row.serviceId !== item.serviceId)
                          )
                        }
                      >
                        Fjern
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        </div>
        <div className="shrink-0 border-t border-border/80 bg-white px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? "Opretter…" : "Opret kunde"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
