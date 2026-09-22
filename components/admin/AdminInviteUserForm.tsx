"use client"

import { FormEvent, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { UserRole } from "@/lib/db/types"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

export function AdminInviteUserForm({
  organizationId,
  onInvited,
}: {
  organizationId?: string
  onInvited?: () => void
}) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<UserRole>("client_admin")
  const [method, setMethod] = useState<"email" | "password">("email")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          role,
          method,
          password: method === "password" ? password : undefined,
          organizationId: role === "censio_admin" ? null : organizationId,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("errorInviteUser"))

      setMessage(
        method === "email"
          ? t("inviteSent", { email })
          : t("userCreated", { email })
      )
      setEmail("")
      setFullName("")
      setPassword("")
      onInvited?.()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("errorInviteUser")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inviteUserTitle")}</CardTitle>
        <CardDescription>{t("inviteUserDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("email")}</span>
            <input
              type="email"
              className={fieldClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("nameOptional")}</span>
            <input
              className={fieldClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("role")}</span>
            <select
              className={fieldClass}
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              <option value="client_admin">{t("roleClientAdmin")}</option>
              <option value="client_user">{t("roleClientUser")}</option>
              {!organizationId ? (
                <option value="censio_admin">{t("roleCensioAdmin")}</option>
              ) : null}
            </select>
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("method")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="invite-method"
                checked={method === "email"}
                onChange={() => setMethod("email")}
              />
              {t("methodEmailInvite")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="invite-method"
                checked={method === "password"}
                onChange={() => setMethod("password")}
              />
              {t("methodPassword")}
            </label>
          </fieldset>
          {method === "password" ? (
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("password")}</span>
              <input
                type="password"
                className={fieldClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          ) : null}
          <Button type="submit" className="h-10 w-fit" disabled={submitting}>
            {submitting ? t("sending") : t("inviteUser")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
