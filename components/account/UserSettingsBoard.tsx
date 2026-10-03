"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEmployeeRoleLabel, type EmployeeRole } from "@/lib/account-settings"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type AdminRow = {
  id: string
  name: string
  email: string
  username: string
  title: string
  headAdmin: boolean
  role: EmployeeRole
  hasPassword: boolean
}

export function UserSettingsBoard() {
  const { user, refreshUser } = useAccountSettings()
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteUsername, setInviteUsername] = useState("")
  const [inviteRole, setInviteRole] = useState<EmployeeRole>("admin")
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [admins, setAdmins] = useState<AdminRow[]>([])
  /** Kun UI — gemmes ikke endnu */
  const [roleDraft, setRoleDraft] = useState<Record<string, EmployeeRole>>({})
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const isCensioStaff = user?.globalRole === "censio_admin"

  async function loadAdmins() {
    const response = await fetch("/api/admin/admins")
    if (!response.ok) return
    const payload = (await response.json()) as { admins?: AdminRow[] }
    setAdmins(payload.admins ?? [])
  }

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setTitle(user.title)
    setEmail(user.email)
    setUsername(user.username)
    setProfileImage(user.profileImage)
  }, [user])

  useEffect(() => {
    if (!isCensioStaff) return
    void loadAdmins()
  }, [isCensioStaff])

  const portrait = profileImage || "/kaj-eli-joensen.jpg"

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Indstillinger
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Din profil, adgangskode og brugere i Censio Internal. Rollefordeling (admin / medarbejder) er
            synlig nu og får funktion senere.
          </p>
        </div>
        {user?.headAdmin ? (
          <Link
            href="/indstillinger/log"
            className="text-sm font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
          >
            Log
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="dashboard-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Din profil</CardTitle>
            <CardDescription>Navn, stilling, e-mail og brugernavn.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                setProfileMessage(null)
                setProfileError(null)
                setSavingProfile(true)
                void (async () => {
                  const response = await fetch("/api/auth/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, title, email, username, profileImage }),
                  })
                  const payload = (await response.json()) as { error?: string }
                  setSavingProfile(false)
                  if (!response.ok) {
                    setProfileError(payload.error || "Profilen kunne ikke gemmes.")
                    return
                  }
                  setProfileMessage("Profilen er gemt.")
                  await refreshUser()
                })()
              }}
            >
              <div className="flex items-center gap-4">
                <img
                  src={portrait}
                  alt=""
                  className={`size-16 rounded-full object-cover ring-1 ring-border ${portrait.includes("kaj-eli-joensen") ? "object-[center_30%]" : "object-center"}`}
                />
                <label className="grid min-w-0 flex-1 gap-1.5 text-sm text-[var(--text-secondary)]">
                  Profilbillede
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024) {
                        setProfileError("Billedet er for stort. Vælg et under 2 MB.")
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        if (typeof reader.result === "string") setProfileImage(reader.result)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              </div>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Navn
                <input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Stilling
                <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Brugernavn
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={fieldClass}
                />
              </label>
              {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
              {profileMessage ? <p className="text-sm text-[var(--text-primary)]">{profileMessage}</p> : null}
              <Button type="submit" disabled={savingProfile} className="justify-self-start">
                Gem profil
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="dashboard-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Skift kode</CardTitle>
            <CardDescription>Opdater din egen adgangskode (mindst 8 tegn).</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                setPasswordMessage(null)
                setPasswordError(null)
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
                void (async () => {
                  const response = await fetch("/api/auth/password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentPassword, newPassword }),
                  })
                  const payload = (await response.json()) as { error?: string }
                  if (!response.ok) {
                    setPasswordError(payload.error || "Koden kunne ikke opdateres.")
                    return
                  }
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setPasswordMessage("Koden er opdateret.")
                })()
              }}
            >
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Nuværende kode
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Ny kode
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Gentag ny kode
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
              {passwordMessage ? <p className="text-sm text-[var(--text-primary)]">{passwordMessage}</p> : null}
              <Button type="submit" className="justify-self-start">
                Gem kode
              </Button>
            </form>
          </CardContent>
        </Card>

        {isCensioStaff ? (
          <Card className="dashboard-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Brugere i Censio Internal</CardTitle>
              <CardDescription>
                Alle med adgang til internt overblik. Head admin kan invitere og sætte koder for andre.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {user?.headAdmin ? (
                <form
                  className="grid gap-3 rounded-[14px] border border-dashed border-border p-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    setInviteError(null)
                    setInviteMessage(null)
                    setInviteUrl(null)
                    void (async () => {
                      const response = await fetch("/api/admin/admins", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: inviteName,
                          email: inviteEmail,
                          username: inviteUsername,
                          role: inviteRole,
                        }),
                      })
                      const payload = (await response.json()) as {
                        error?: string
                        sent?: boolean
                        url?: string
                      }
                      if (!response.ok) {
                        setInviteError(payload.error || "Invitationen kunne ikke sendes.")
                        return
                      }
                      setInviteName("")
                      setInviteEmail("")
                      setInviteUsername("")
                      setInviteRole("admin")
                      setInviteUrl(payload.url ?? null)
                      setInviteMessage(
                        payload.sent
                          ? "Invitationen er sendt."
                          : "Invitationen er oprettet. Kopier linket, hvis mailen ikke blev sendt."
                      )
                      await loadAdmins()
                    })()
                  }}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)] sm:col-span-2">
                    Tilføj bruger
                  </p>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    Navn
                    <input
                      required
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    E-mail
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    Brugernavn
                    <input
                      required
                      value={inviteUsername}
                      onChange={(event) => setInviteUsername(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    Rolle
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as EmployeeRole)}
                    >
                      <SelectTrigger className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="medarbejder">Medarbejder</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  {inviteError ? (
                    <p className="text-sm text-destructive sm:col-span-2">{inviteError}</p>
                  ) : null}
                  {inviteMessage ? (
                    <p className="text-sm text-[var(--text-primary)] sm:col-span-2">{inviteMessage}</p>
                  ) : null}
                  {inviteUrl ? (
                    <div className="flex gap-2 sm:col-span-2">
                      <input readOnly value={inviteUrl} aria-label="Invitationslink" className={fieldClass} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard.writeText(inviteUrl)
                        }}
                      >
                        Kopier
                      </Button>
                    </div>
                  ) : null}
                  <Button type="submit" className="justify-self-start sm:col-span-2">
                    Send invitation
                  </Button>
                </form>
              ) : null}

              {admins.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Ingen brugere fundet.</p>
              ) : (
                <div className="overflow-x-auto rounded-[12px] border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-[var(--surface-muted)]/60 text-xs font-medium text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-3 py-2.5">Navn</th>
                        <th className="px-3 py-2.5">Stilling</th>
                        <th className="px-3 py-2.5">E-mail</th>
                        <th className="px-3 py-2.5">Brugernavn</th>
                        <th className="px-3 py-2.5">Rolle</th>
                        <th className="px-3 py-2.5">Status</th>
                        {user?.headAdmin ? <th className="px-3 py-2.5" /> : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">{admin.name}</td>
                          <td className="px-3 py-2.5 text-[var(--text-secondary)]">{admin.title || "—"}</td>
                          <td className="px-3 py-2.5 text-[var(--text-secondary)]">{admin.email}</td>
                          <td className="px-3 py-2.5 text-[var(--text-secondary)]">{admin.username}</td>
                          <td className="px-3 py-2.5">
                            {admin.headAdmin ? (
                              "Head admin"
                            ) : user?.headAdmin ? (
                              <Select
                                value={roleDraft[admin.id] ?? admin.role}
                                onValueChange={(value) =>
                                  setRoleDraft((current) => ({
                                    ...current,
                                    [admin.id]: value as EmployeeRole,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 min-w-[9.5rem] rounded-[12px] border-border bg-white text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="medarbejder">Medarbejder</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getEmployeeRoleLabel(roleDraft[admin.id] ?? admin.role)
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                            {admin.hasPassword ? "Aktiv" : "Afventer kode"}
                          </td>
                          {user?.headAdmin ? (
                            <td className="px-3 py-2.5 text-right">
                              {admin.headAdmin ? (
                                <span className="text-xs text-[var(--text-secondary)]">—</span>
                              ) : (
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                                  onClick={() => {
                                    setResetUserId(admin.id)
                                    setResetPassword("")
                                    setResetError(null)
                                    setResetMessage(null)
                                  }}
                                >
                                  Skift kode
                                </button>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {user?.headAdmin && resetUserId ? (
                <form
                  className="grid max-w-md gap-3 rounded-[12px] border border-border bg-[var(--surface-muted)]/30 p-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    setResetError(null)
                    setResetMessage(null)
                    if (resetPassword.length < 8) {
                      setResetError("Koden skal være mindst 8 tegn.")
                      return
                    }
                    void (async () => {
                      const response = await fetch(`/api/admin/admins/${resetUserId}/password`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ newPassword: resetPassword }),
                      })
                      const payload = (await response.json()) as { error?: string }
                      if (!response.ok) {
                        setResetError(payload.error || "Koden kunne ikke opdateres.")
                        return
                      }
                      setResetMessage("Ny kode er sat for brugeren.")
                      setResetPassword("")
                      setResetUserId(null)
                      await loadAdmins()
                    })()
                  }}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Ny kode for{" "}
                    {admins.find((admin) => admin.id === resetUserId)?.name ?? "bruger"}
                  </p>
                  <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                    Ny adgangskode
                    <input
                      type="password"
                      required
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  {resetError ? <p className="text-sm text-destructive">{resetError}</p> : null}
                  {resetMessage ? <p className="text-sm text-[var(--text-primary)]">{resetMessage}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit">Gem ny kode</Button>
                    <Button type="button" variant="outline" onClick={() => setResetUserId(null)}>
                      Annuller
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
