"use client"

import { FormEvent, useCallback, useState } from "react"
import { MailIcon, SendIcon, ShieldCheckIcon, UserPlusIcon } from "lucide-react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import {
  INITIAL_PORTAL_ACCESS_DRAFT,
  isPortalAccessDraftValid,
  PortalAccessFields,
  PortalLoginDetails,
  type PortalAccessDraft,
  type PortalLogin,
} from "@/components/admin/PortalAccessFields"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import type { UserRole } from "@/lib/db/types"

type ClientRole = Extract<UserRole, "client_admin" | "client_user">

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
  const clientName =
    props.mode === "client" && props.clientName ? formatClientDisplayName(props.clientName) : null

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [clientRole, setClientRole] = useState<ClientRole>("client_admin")
  const [access, setAccess] = useState<PortalAccessDraft>(
    isAdminInvite ? { method: "email", password: "" } : INITIAL_PORTAL_ACCESS_DRAFT
  )
  const [createdLogin, setCreatedLogin] = useState<PortalLogin | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dismissMessage = useCallback(() => setMessage(null), [])
  const dismissError = useCallback(() => setError(null), [])

  useAutoDismiss(message, dismissMessage)
  useAutoDismiss(error, dismissError, 6000)

  const role: UserRole = isAdminInvite ? "censio_admin" : clientRole

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isPortalAccessDraftValid(access)) return

    setSubmitting(true)
    setError(null)
    setMessage(null)
    setCreatedLogin(null)

    const submittedEmail = email.trim().toLowerCase()

    try {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: submittedEmail,
          fullName,
          role,
          method: access.method,
          password: access.method === "password" ? access.password : undefined,
          organizationId: isAdminInvite ? null : props.organizationId,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("errorInviteUser"))

      if (access.method === "email") {
        setMessage(
          isAdminInvite
            ? t("inviteAdminSent", { email: submittedEmail })
            : t("inviteClientSent", { email: submittedEmail, name: clientName ?? "" })
        )
      } else if (isAdminInvite) {
        setMessage(t("adminCreated", { email: submittedEmail }))
      } else {
        setCreatedLogin({ email: submittedEmail, password: access.password })
      }

      setEmail("")
      setFullName("")
      setClientRole("client_admin")
      setAccess(isAdminInvite ? { method: "email", password: "" } : INITIAL_PORTAL_ACCESS_DRAFT)
      setFormKey((current) => current + 1)
      props.onInvited?.()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("errorInviteUser"))
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
        {createdLogin ? (
          <PortalLoginDetails
            login={createdLogin}
            onDone={() => setCreatedLogin(null)}
            className="mb-4"
          />
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

          {!isAdminInvite ? (
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">{t("role")}</span>
              <select
                className={adminFieldClass}
                value={clientRole}
                onChange={(event) => setClientRole(event.target.value as ClientRole)}
              >
                <option value="client_admin">{t("roleClientAdmin")}</option>
                <option value="client_user">{t("roleClientUser")}</option>
              </select>
            </label>
          ) : null}

          <PortalAccessFields
            key={formKey}
            value={access}
            onChange={setAccess}
            disabled={submitting}
            idPrefix={isAdminInvite ? "admin-invite" : "client-invite"}
            title={isAdminInvite ? t("method") : t("portalAccessTitle")}
          />

          {error ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-800"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-10 w-full gap-2 sm:w-fit"
            disabled={submitting || !isPortalAccessDraftValid(access)}
          >
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
