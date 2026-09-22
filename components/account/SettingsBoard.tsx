"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, UserRoundIcon } from "lucide-react"

import {
  useAccountSettings,
  useCompanyServices,
} from "@/components/account/AccountSettingsProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENT_COMPANY } from "@/lib/company"
import {
  getEmployeeRoleLabel,
  type EmployeeRole,
} from "@/lib/account-settings"
import { cn } from "cn"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vælg en billedfil."))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Billedet må højst være 2 MB."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Billedet kunne ikke læses."))
    }
    reader.onerror = () => reject(new Error("Billedet kunne ikke læses."))
    reader.readAsDataURL(file)
  })
}

function ImageUpload({
  label,
  description,
  value,
  rounded,
  onChange,
}: {
  label: string
  description: string
  value: string
  rounded: "full" | "lg"
  onChange: (next: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center overflow-hidden bg-muted ring-1 ring-border",
          rounded === "full" ? "rounded-full" : "rounded-[15px]"
        )}
      >
        {value ? (
          // User-uploaded data URLs are not in the Next image loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : rounded === "full" ? (
          <UserRoundIcon className="size-8 text-muted-foreground" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            try {
              const next = await readImageFile(file)
              setError(null)
              onChange(next)
            } catch (caught) {
              setError(
                caught instanceof Error ? caught.message : "Kunne ikke skifte billede."
              )
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={() => inputRef.current?.click()}
        >
          Skift {label.toLowerCase()}
        </Button>
        {error ? <p className="mt-2 text-sm text-danger-foreground">{error}</p> : null}
      </div>
    </div>
  )
}

function RemoveServiceButton({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={`Fjern ${label}`}
          />
        }
      >
        Fjern
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 bg-[#f7f7f5] p-3">
        <PopoverHeader>
          <PopoverTitle>Fjern ydelse?</PopoverTitle>
          <PopoverDescription>
            {label} fjernes fra jeres ydelser. Eksisterende leads beholder den i
            historikken.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annuller
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setOpen(false)
              onRemove()
            }}
          >
            Fjern
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CompanyServicesCard() {
  const {
    enabledServices,
    availableServices,
    addService,
    addCustomService,
    removeService,
  } = useCompanyServices()
  const [serviceToAdd, setServiceToAdd] = useState("")
  const [customLabel, setCustomLabel] = useState("")
  const [serviceError, setServiceError] = useState<string | null>(null)

  useEffect(() => {
    if (
      serviceToAdd &&
      !availableServices.some((service) => service.id === serviceToAdd)
    ) {
      setServiceToAdd("")
    }
  }, [availableServices, serviceToAdd])

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>Ydelser</CardTitle>
        <CardDescription>
          Tilføj eller fjern de services I tilbyder. De vises i filtre og når I
          opretter leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {enabledServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            I har ingen ydelser valgt. Tilføj mindst én, så I kan filtrere og
            tildele services.
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[15px] border border-border">
            {enabledServices.map((service) => (
              <div
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <p className="text-sm font-medium">{service.label}</p>
                <RemoveServiceButton
                  label={service.label}
                  onRemove={() => removeService(service.id)}
                />
              </div>
            ))}
          </div>
        )}

        {availableServices.length > 0 ? (
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              if (!serviceToAdd) return
              addService(serviceToAdd)
              setServiceToAdd("")
              setServiceError(null)
            }}
          >
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Tilføj fra listen
              </span>
              <Select
                value={serviceToAdd || null}
                onValueChange={(value) => {
                  if (typeof value === "string") setServiceToAdd(value)
                }}
              >
                <SelectTrigger
                  className="dashboard-chip w-full px-4"
                  aria-label="Tilføj ydelse fra listen"
                >
                  <SelectValue placeholder="Vælg ydelse" />
                </SelectTrigger>
                <SelectContent className="dashboard-filter-menu">
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button type="submit" className="h-11 rounded-[5px] px-4">
              Tilføj
            </Button>
          </form>
        ) : null}

        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            const label = customLabel.trim()
            if (!label) {
              setServiceError("Skriv navnet på ydelsen.")
              return
            }
            if (
              enabledServices.some(
                (service) => service.label.toLowerCase() === label.toLowerCase()
              )
            ) {
              setServiceError("Ydelsen er allerede tilføjet.")
              return
            }
            addCustomService(label)
            setCustomLabel("")
            setServiceError(null)
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tilføj ny ydelse
            </span>
            <input
              value={customLabel}
              onChange={(event) => {
                setCustomLabel(event.target.value)
                setServiceError(null)
              }}
              placeholder="Fx. Køkken, carport, gulvslibning"
              className={fieldClass}
            />
          </label>
          <Button type="submit" className="h-11 rounded-[5px] px-4">
            Tilføj
          </Button>
        </form>
        {serviceError ? (
          <p className="text-sm text-danger-foreground">{serviceError}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function SettingsBoard() {
  const { settings, updateSettings, addEmployee } = useAccountSettings()
  const [email, setEmail] = useState(settings.email)
  const [emailSaved, setEmailSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState("")
  const [employeeEmail, setEmployeeEmail] = useState("")
  const [employeeRole, setEmployeeRole] = useState<EmployeeRole>("medarbejder")
  const [employeeMessage, setEmployeeMessage] = useState<string | null>(null)
  const [employeeError, setEmployeeError] = useState<string | null>(null)

  useEffect(() => {
    setEmail(settings.email)
  }, [settings.email])

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Konto
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
        Indstillinger
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Profil, logo, ydelser, login og adgang for{" "}
        {CURRENT_COMPANY.name}.
      </p>

      <div className="mt-8 grid gap-5">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Profil og logo</CardTitle>
            <CardDescription>
              Sådan vises I i topmenuen og på jeres dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <ImageUpload
              label="Profilbillede"
              description="Bruges ved jeres navn øverst til højre."
              value={settings.profileImage}
              rounded="full"
              onChange={(profileImage) => updateSettings({ profileImage })}
            />
            <ImageUpload
              label="Logo"
              description="Vises ved siden af Censio-logoet."
              value={settings.logo}
              rounded="lg"
              onChange={(logo) => updateSettings({ logo })}
            />
          </CardContent>
        </Card>

        <CompanyServicesCard />

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Skift e-mail</CardTitle>
            <CardDescription>
              Den e-mail I logger ind med og får beskeder på.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                const next = email.trim().toLowerCase()
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return
                updateSettings({ email: next })
                setEmailSaved(true)
              }}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setEmailSaved(false)
                  }}
                  className={fieldClass}
                />
              </label>
              <Button type="submit" className="h-11 rounded-[5px] px-4">
                Gem e-mail
              </Button>
            </form>
            {emailSaved ? (
              <p className="mt-3 text-sm text-success-foreground">
                E-mailen er opdateret.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Skift kode</CardTitle>
            <CardDescription>
              Vælg en ny adgangskode på mindst 8 tegn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                setPasswordMessage(null)
                if (newPassword.length < 8) {
                  setPasswordError("Den nye kode skal være mindst 8 tegn.")
                  return
                }
                if (newPassword !== confirmPassword) {
                  setPasswordError("De to nye koder er ikke ens.")
                  return
                }
                if (!currentPassword) {
                  setPasswordError("Skriv din nuværende kode.")
                  return
                }
                setPasswordError(null)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setPasswordMessage("Koden er opdateret.")
              }}
            >
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Nuværende kode
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Ny kode
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Gentag ny kode
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
              <div>
                <Button type="submit">Gem kode</Button>
              </div>
            </form>
            {passwordError ? (
              <p className="mt-3 text-sm text-danger-foreground">{passwordError}</p>
            ) : null}
            {passwordMessage ? (
              <p className="mt-3 text-sm text-success-foreground">{passwordMessage}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Giv adgang til en medarbejder</CardTitle>
            <CardDescription>
              Inviter en kollega, så de kan logge ind på jeres dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                const name = employeeName.trim()
                const nextEmail = employeeEmail.trim().toLowerCase()
                setEmployeeMessage(null)
                if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
                  setEmployeeError("Udfyld navn og en gyldig e-mail.")
                  return
                }
                if (
                  settings.employees.some(
                    (employee) => employee.email === nextEmail
                  )
                ) {
                  setEmployeeError("Den e-mail har allerede adgang.")
                  return
                }
                addEmployee({
                  name,
                  email: nextEmail,
                  role: employeeRole,
                })
                setEmployeeName("")
                setEmployeeEmail("")
                setEmployeeRole("medarbejder")
                setEmployeeError(null)
                setEmployeeMessage(`Invitation sendt til ${nextEmail}.`)
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Navn
                  </span>
                  <input
                    value={employeeName}
                    onChange={(event) => setEmployeeName(event.target.value)}
                    placeholder="Fulde navn"
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    E-mail
                  </span>
                  <input
                    type="email"
                    value={employeeEmail}
                    onChange={(event) => setEmployeeEmail(event.target.value)}
                    placeholder="navn@virksomhed.dk"
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="grid max-w-56 gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Rolle
                </span>
                <Select
                  value={employeeRole}
                  onValueChange={(value) => {
                    if (value === "medarbejder" || value === "admin") {
                      setEmployeeRole(value)
                    }
                  }}
                >
                  <SelectTrigger
                    className="dashboard-chip w-full px-4"
                    aria-label="Rolle"
                  >
                    <SelectValue>
                      {employeeRole === "admin" ? "Admin" : "Medarbejder"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dashboard-filter-menu">
                    <SelectItem value="medarbejder">Medarbejder</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <div>
                <Button type="submit">Send invitation</Button>
              </div>
            </form>
            {employeeError ? (
              <p className="text-sm text-danger-foreground">{employeeError}</p>
            ) : null}
            {employeeMessage ? (
              <p className="text-sm text-success-foreground">{employeeMessage}</p>
            ) : null}

            <div className="divide-y divide-border overflow-hidden rounded-[15px] border border-border">
              {settings.employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                      {getEmployeeRoleLabel(employee.role)}
                    </span>
                    <span
                      className={
                        employee.status === "active"
                          ? "text-success-foreground"
                          : "text-primary"
                      }
                    >
                      {employee.status === "active" ? "Aktiv" : "Invitation sendt"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
