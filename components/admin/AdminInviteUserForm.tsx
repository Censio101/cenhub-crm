"use client"

import { FormEvent, useCallback, useState } from "react"
import { Building2Icon, MailIcon, SendIcon, ShieldCheckIcon, UserPlusIcon } from "lucide-react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import type { UserRole } from "@/lib/db/types"

function MethodRow({
  checked,
  label,
  onSelect,
}: {
  checked: boolean
  label: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] font-medium transition-colors",
        checked
          ? "border-primary bg-primary/5 text-foreground"
          : "border-[#d3c3b2] bg-white text-foreground hover:bg-[#faf8f6]"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-primary" : "border-[#d3c3b2]"
        )}
        aria-hidden="true"
      >
        {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      {label}
    </button>
  )
}

type AdminInviteUserFormProps =
  | {
      mode: "admin"
      organizationId?: never
      clientName?: never
      onInvited?: () => void
    }
  | {
      mode: "client"
      organizationId: string
      clientName?: string
      onInvited?: () => void
    }

export function AdminInviteUserForm(props: AdminInviteUserFormProps) {
  const { t } = useLanguage()
  const isAdminInvite = props.mode === "admin"
  const role: UserRole = isAdminInvite ? "censio_admin" : "client_user"
  const clientName = props.mode === "client" && props.clientName
    ? formatClientDisplayName(props.clientName)
    : null

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [method, setMethod] = useState<"email" | "password">("email")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dismissMessage = useCallback(() => setMessage(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(message, dismissMessage)
  useAutoDismiss(error, dismissError, 6000)

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
          organizationId: isAdminInvite ? null : props.organizationId,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("errorInviteUser"))

      setMessage(
        method === "email"
          ? isAdminInvite
            ? t("inviteAdminSent", { email })
            : t("inviteClientSent", { email, name: clientName ?? "" })
          : isAdminInvite
            ? t("adminCreated", { email })
            : t("clientUserCreated", { email, name: clientName ?? "" })
      )
      setEmail("")
      setFullName("")
      setPassword("")
      props.onInvited?.()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("errorInviteUser")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
        <span className={adminIconBoxClass(isAdminInvite ? "brand" : "blue")} aria-hidden="true">
          {isAdminInvite ? (
            <ShieldCheckIcon className="size-[18px]" />
          ) : (
            <UserPlusIcon className="size-[18px]" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {isAdminInvite ? t("inviteAdminTitle") : t("inviteClientUserTitle")}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {isAdminInvite
              ? t("inviteAdminSubtitle")
              : t("inviteClientUserSubtitle", { name: clientName ?? t("clientSettingsLabel") })}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        {!isAdminInvite ? (
          <div className="mb-4 flex gap-3 rounded-xl border border-[#d3c3b2] bg-white px-3.5 py-3">
            <Building2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-[13px] text-muted-foreground">{t("inviteClientUserCallout")}</p>
          </div>
        ) : null}

        <form className="grid gap-3.5" onSubmit={handleSubmit}>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">{t("email")}</span>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                className={cn(adminFieldClass, "pl-10")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">{t("nameOptional")}</span>
            <input
              className={adminFieldClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="mb-0.5 text-[13px] font-semibold text-foreground">
              {t("method")}
            </legend>
            <div className="grid gap-2" role="radiogroup" aria-label={t("method")}>
              <MethodRow
                checked={method === "email"}
                label={t("methodEmailInvite")}
                onSelect={() => setMethod("email")}
              />
              <MethodRow
                checked={method === "password"}
                label={t("methodPassword")}
                onSelect={() => setMethod("password")}
              />
            </div>
          </fieldset>

          {method === "password" ? (
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">{t("password")}</span>
              <input
                type="password"
                className={adminFieldClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800" role="status">
              {message}
            </p>
          ) : null}

          <Button type="submit" className="h-10 w-full gap-2 sm:w-fit" disabled={submitting}>
            {isAdminInvite ? (
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
            ) : (
              <SendIcon className="size-4" aria-hidden="true" />
            )}
            {submitting
              ? t("sending")
              : isAdminInvite
                ? t("inviteAdminButton")
                : t("inviteClientUserButton")}
          </Button>
        </form>
      </div>
    </section>
  )
}
