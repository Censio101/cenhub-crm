"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { SERVICES } from "@/lib/performance/services"
import { workspaceStatusLabel } from "@/lib/onboarding/public"
import type { AdminWorkspaceRow, InviteDelivery } from "@/lib/onboarding/types"
import type { EmployeeRole } from "@/lib/account-settings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { onboardingFieldClass } from "@/components/onboarding/field"

type EmployeeDraft = {
  name: string
  email: string
  role: EmployeeRole
}

const emptyEmployee = (): EmployeeDraft => ({
  name: "",
  email: "",
  role: "medarbejder",
})

export function AdminCustomersBoard() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([])
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [enabledServiceIds, setEnabledServiceIds] = useState<string[]>(
    SERVICES.map((service) => service.id)
  )
  const [customLabel, setCustomLabel] = useState("")
  const [customServiceLabels, setCustomServiceLabels] = useState<string[]>([])
  const [hvidbjergPartner, setHvidbjergPartner] = useState(true)
  const [logo, setLogo] = useState("")
  const [employees, setEmployees] = useState<EmployeeDraft[]>([emptyEmployee()])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<"invite" | "immediate" | null>(null)
  const [lastDeliveries, setLastDeliveries] = useState<InviteDelivery[]>([])

  async function load() {
    const me = await fetch("/api/auth/me")
    const session = (await me.json()) as {
      user?: { globalRole?: string } | null
    }
    if (session.user?.globalRole !== "censio_admin") {
      setAllowed(false)
      return
    }
    setAllowed(true)
    const response = await fetch("/api/admin/workspaces")
    const payload = (await response.json()) as { workspaces?: AdminWorkspaceRow[] }
    setWorkspaces(payload.workspaces ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setCompanyName("")
    setContactName("")
    setContactEmail("")
    setEnabledServiceIds(SERVICES.map((service) => service.id))
    setCustomServiceLabels([])
    setCustomLabel("")
    setHvidbjergPartner(true)
    setLogo("")
    setEmployees([emptyEmployee()])
  }

  async function submit(mode: "invite" | "immediate") {
    setPending(mode)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          companyName,
          contactName,
          contactEmail,
          enabledServiceIds,
          customServiceLabels,
          hvidbjergPartner,
          logo: logo || undefined,
          employees: employees.filter((employee) => employee.name && employee.email),
        }),
      })
      const payload = (await response.json()) as {
        error?: string
        workspace?: AdminWorkspaceRow
        deliveries?: InviteDelivery[]
      }
      if (!response.ok) {
        setError(payload.error || "Kunne ikke oprette kunden.")
        return
      }
      setLastDeliveries(payload.deliveries ?? [])
      setMessage(
        mode === "invite"
          ? "Invitationen er klar. Kunden kan nu oprette deres bruger."
          : "Workspace er oprettet og klar uden at kunden var inde over."
      )
      resetForm()
      await load()
    } catch {
      setError("Kunne ikke oprette kunden.")
    } finally {
      setPending(null)
    }
  }

  async function resend(workspaceId: string, inviteId?: string) {
    const response = await fetch(`/api/admin/workspaces/${workspaceId}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteId ? { inviteId } : {}),
    })
    const payload = (await response.json()) as {
      error?: string
      deliveries?: InviteDelivery[]
    }
    if (!response.ok) {
      setError(payload.error || "Kunne ikke sende invitationen igen.")
      return
    }
    setLastDeliveries(payload.deliveries ?? [])
    setMessage("Invitationen er sendt igen.")
    await load()
  }

  if (allowed === false) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Kun for Censio</CardTitle>
            <CardDescription>
              Log ind med Censio-kontoen for at oprette nye kunder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/login" />}>Log ind</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (allowed === null) {
    return <p className="text-sm text-muted-foreground">Indlæser kunder…</p>
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          Censio
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
          Nye kunder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Udfyld felterne og send en invitation, eller opret workspace’et med det
          samme, hvis kunden ikke skal være inde over.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Kundekort</CardTitle>
          <CardDescription>
            Samme felter til begge veje. Provisioneringen opretter virksomhed,
            ejer, ydelser og medarbejdere.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Virksomhedsnavn
              </span>
              <input
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Nordkystens Tømrer"
                className={onboardingFieldClass}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Kontaktperson
              </span>
              <input
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Fulde navn"
                className={onboardingFieldClass}
              />
            </label>
            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                E-mail
              </span>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="kontakt@virksomhed.dk"
                className={onboardingFieldClass}
              />
            </label>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Ydelser</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((service) => {
                const checked = enabledServiceIds.includes(service.id)
                return (
                  <label
                    key={service.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setEnabledServiceIds((current) =>
                          checked
                            ? current.filter((id) => id !== service.id)
                            : [...current, service.id]
                        )
                      }}
                    />
                    {service.label}
                  </label>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {customServiceLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full bg-muted px-3 py-1.5 text-sm"
                  onClick={() =>
                    setCustomServiceLabels((current) =>
                      current.filter((item) => item !== label)
                    )
                  }
                >
                  {label} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="Tilføj ny ydelse"
                className={onboardingFieldClass}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = customLabel.trim()
                  if (!next) return
                  setCustomServiceLabels((current) =>
                    current.includes(next) ? current : [...current, next]
                  )
                  setCustomLabel("")
                }}
              >
                Tilføj
              </Button>
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Logo (valgfrit, billed-URL)
            </span>
            <input
              value={logo}
              onChange={(event) => setLogo(event.target.value)}
              placeholder="/logo.svg"
              className={onboardingFieldClass}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hvidbjergPartner}
              onChange={(event) => setHvidbjergPartner(event.target.checked)}
            />
            Hvidbjerg certificeret partner
          </label>

          <div className="grid gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              Medarbejdere (valgfrit)
            </p>
            {employees.map((employee, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={employee.name}
                  onChange={(event) => {
                    const next = [...employees]
                    next[index] = { ...employee, name: event.target.value }
                    setEmployees(next)
                  }}
                  placeholder="Navn"
                  className={onboardingFieldClass}
                />
                <input
                  type="email"
                  value={employee.email}
                  onChange={(event) => {
                    const next = [...employees]
                    next[index] = { ...employee, email: event.target.value }
                    setEmployees(next)
                  }}
                  placeholder="e-mail"
                  className={onboardingFieldClass}
                />
                <select
                  value={employee.role}
                  onChange={(event) => {
                    const next = [...employees]
                    next[index] = {
                      ...employee,
                      role: event.target.value as EmployeeRole,
                    }
                    setEmployees(next)
                  }}
                  className={onboardingFieldClass}
                >
                  <option value="medarbejder">Medarbejder</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmployees((current) => [...current, emptyEmployee()])}
            >
              Tilføj medarbejder
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending !== null}
              onClick={() => void submit("invite")}
            >
              {pending === "invite" ? "Sender…" : "Send invitation"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => void submit("immediate")}
            >
              {pending === "immediate" ? "Opretter…" : "Opret nu"}
            </Button>
          </div>
          {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}
          {message ? <p className="text-sm text-success-foreground">{message}</p> : null}
          {lastDeliveries.length > 0 ? (
            <div className="rounded-[15px] border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium">Invitationer</p>
              <ul className="mt-2 grid gap-2 text-sm">
                {lastDeliveries.map((delivery) => (
                  <li key={delivery.inviteId}>
                    <span className="font-medium">{delivery.email}</span>
                    {delivery.sent ? " · sendt" : " · link klar"}
                    <div className="break-all text-xs text-muted-foreground">
                      {delivery.url}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            Status på mails og hvem der har accepteret.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen kunder endnu.</p>
          ) : (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="rounded-[15px] border border-border bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{workspace.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {workspace.contactName} · {workspace.contactEmail}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {workspaceStatusLabel(workspace.status)}
                  </span>
                </div>
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {workspace.employees.map((employee) => (
                    <li
                      key={employee.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        {employee.name} · {employee.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {employee.role} ·{" "}
                        {employee.status === "active" ? "accepteret" : "inviteret"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void resend(workspace.id)}
                  >
                    Gensend invitationer
                  </Button>
                  {workspace.deliveries.map((delivery) => (
                    <Button
                      key={delivery.inviteId}
                      type="button"
                      variant="ghost"
                      onClick={() => void resend(workspace.id, delivery.inviteId)}
                    >
                      Gensend {delivery.email}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
