"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SERVICES } from "@/lib/performance/services"
import { signIn } from "@/lib/session"
import type { EmployeeRole } from "@/lib/account-settings"
import type { PublicInvite } from "@/lib/onboarding/types"
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

export function WelcomeBoard({ token }: { token: string }) {
  const router = useRouter()
  const [invite, setInvite] = useState<PublicInvite | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [enabledServiceIds, setEnabledServiceIds] = useState<string[]>([])
  const [customLabel, setCustomLabel] = useState("")
  const [customServiceLabels, setCustomServiceLabels] = useState<string[]>([])
  const [employees, setEmployees] = useState<EmployeeDraft[]>([
    { name: "", email: "", role: "medarbejder" },
  ])
  const [pending, setPending] = useState(false)

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/invite/${token}`)
      const payload = (await response.json()) as {
        error?: string
        invite?: PublicInvite
      }
      if (!response.ok || !payload.invite) {
        setError(payload.error || "Invitationen er ugyldig eller udløbet.")
        return
      }
      setInvite(payload.invite)
      setName(payload.invite.name)
      setCompanyName(payload.invite.workspace.name)
      setEnabledServiceIds(payload.invite.workspace.enabledServiceIds)
      setCustomServiceLabels(
        payload.invite.workspace.customServices.map((service) => service.label)
      )
    })()
  }, [token])

  if (error && !invite) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Invitationen virker ikke</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/login" />}>Gå til login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return <p className="text-sm text-muted-foreground">Henter invitation…</p>
  }

  const isOwner = invite.kind === "owner"
  const lastStep = isOwner ? 3 : 1

  async function finish() {
    if (password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn.")
      return
    }
    if (password !== confirmPassword) {
      setError("De to koder er ikke ens.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/invite/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          name,
          companyName,
          enabledServiceIds,
          customServiceLabels,
          employees: isOwner
            ? employees.filter((employee) => employee.name && employee.email)
            : [],
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Kunne ikke oprette brugeren.")
        return
      }
      signIn()
      router.push("/")
      router.refresh()
    } catch {
      setError("Kunne ikke oprette brugeren.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Velkommen
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
        {isOwner ? "Opret jeres Censio" : "Opret din bruger"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {invite.workspace.name} · {invite.email}
      </p>

      <Card className="dashboard-card mt-8">
        <CardHeader>
          <CardTitle>
            {step === 1
              ? "Din bruger"
              : step === 2
                ? "Virksomhed og ydelser"
                : "Giv adgang"}
          </CardTitle>
          <CardDescription>
            {isOwner
              ? `Trin ${step} af ${lastStep}`
              : "Sæt en adgangskode, så du kan logge ind."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 1 ? (
            <>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Navn
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={onboardingFieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Adgangskode
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={onboardingFieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Gentag adgangskode
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={onboardingFieldClass}
                />
              </label>
            </>
          ) : null}

          {step === 2 && isOwner ? (
            <>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Virksomhedsnavn
                </span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className={onboardingFieldClass}
                />
              </label>
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
                        onChange={() =>
                          setEnabledServiceIds((current) =>
                            checked
                              ? current.filter((id) => id !== service.id)
                              : [...current, service.id]
                          )
                        }
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
            </>
          ) : null}

          {step === 3 && isOwner ? (
            <>
              <p className="text-sm text-muted-foreground">
                Inviter dem, der skal have adgang. De får en mail med et link.
              </p>
              {employees.map((employee, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-2">
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
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEmployees((current) => [
                    ...current,
                    { name: "", email: "", role: "medarbejder" },
                  ])
                }
              >
                Tilføj en mere
              </Button>
            </>
          ) : null}

          {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Tilbage
              </Button>
            ) : null}
            {step < lastStep ? (
              <Button type="button" onClick={() => setStep(step + 1)}>
                Fortsæt
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => void finish()}>
                {pending ? "Opretter…" : "Gå til dashboard"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
