"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2Icon, MailIcon, RotateCwIcon, Trash2Icon, UsersIcon } from "lucide-react"

import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm"
import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type ClientUser = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  accessStatus?: "active" | "pending"
}

function ClientUserRow({
  user,
  disabled,
  isRemoving,
  isResending,
  onRemove,
  onResend,
}: {
  user: ClientUser
  disabled?: boolean
  isRemoving?: boolean
  isResending?: boolean
  onRemove: (user: ClientUser) => void
  onResend: (user: ClientUser) => void
}) {
  const { t } = useLanguage()
  const label = user.email ?? user.full_name ?? user.id
  const isPending = user.accessStatus === "pending"

  const rowBusy = isRemoving || isResending

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[#e8e0d8] bg-white px-3.5 py-2.5",
        rowBusy && "opacity-70"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-medium text-foreground">{label}</p>
          {isPending ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {t("adminInvitePending")}
            </span>
          ) : null}
        </div>
        {user.full_name && user.email ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MailIcon className="size-3 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate">{user.email}</span>
          </p>
        ) : null}
      </div>

      <span className="hidden shrink-0 rounded-full bg-[#faf8f6] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase sm:inline-flex">
        {user.role.replace("_", " ")}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 px-3 text-[13px]"
            disabled={disabled || isResending}
            aria-busy={isResending}
            onClick={() => onResend(user)}
          >
            <RotateCwIcon
              className={cn("size-3.5", isResending && "animate-spin")}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{t("adminResendInvite")}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-9 w-9 shrink-0 px-0 text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
          aria-label={t("clientUserRemove")}
          aria-busy={isRemoving}
          disabled={disabled || isRemoving}
          onClick={() => onRemove(user)}
        >
          {isRemoving ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2Icon className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </li>
  )
}

export function AdminClientUsersPanel() {
  const { t } = useLanguage()
  const { slug, organization, users, reload } = useAdminClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<{
    id: string
    action: "remove" | "resend"
  } | null>(null)
  const [displayUsers, setDisplayUsers] = useState<ClientUser[] | null>(null)

  useEffect(() => {
    setDisplayUsers(null)
  }, [users])

  const dismissNotice = useCallback(() => setActionNotice(null), [])
  const dismissError = useCallback(() => setActionError(null), [])

  useAutoDismiss(actionNotice, dismissNotice)
  useAutoDismiss(actionError, dismissError, 6000)

  if (!organization) return null

  async function handleRemoveUser(user: ClientUser) {
    const label = user.email ?? user.full_name ?? user.id
    if (!window.confirm(t("clientUserRemoveConfirm", { email: label }))) return

    setBusyAction({ id: user.id, action: "remove" })
    setActionError(null)
    setActionNotice(null)

    try {
      const response = await fetch(`/api/admin/organizations/${slug}/users/${user.id}`, {
        method: "DELETE",
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientUserRemoveError"))

      setDisplayUsers((current) => {
        const base = current ?? (users as ClientUser[])
        return base.filter((entry) => entry.id !== user.id)
      })
      setActionNotice(t("clientUserRemoved", { email: label }))
      void reload({ silent: true }).finally(() => setDisplayUsers(null))
    } catch (removeError) {
      setActionError(
        removeError instanceof Error ? removeError.message : t("clientUserRemoveError")
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleResendInvite(user: ClientUser) {
    setBusyAction({ id: user.id, action: "resend" })
    setActionError(null)
    setActionNotice(null)

    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/users/${user.id}/resend`,
        { method: "POST" }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("adminResendError"))

      setActionNotice(t("adminResent", { email: user.email ?? "" }))
    } catch (resendError) {
      setActionError(
        resendError instanceof Error ? resendError.message : t("adminResendError")
      )
    } finally {
      setBusyAction(null)
    }
  }

  const clientUsers = displayUsers ?? (users as ClientUser[])

  return (
    <div className="grid gap-5">
      <AdminInviteUserForm
        mode="client"
        organizationId={organization.id}
        clientName={organization.name}
        onInvited={() => {
          void reload({ silent: true })
        }}
      />

      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
          <span className={adminIconBoxClass("neutral")} aria-hidden="true">
            <UsersIcon className="size-[18px]" />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            {t("usersTitle")} · {formatClientDisplayName(organization.name)}
          </h2>
        </div>
        <div className="px-5 py-4">
          {actionError ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
              {actionError}
            </p>
          ) : null}
          {actionNotice ? (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800" role="status">
              {actionNotice}
            </p>
          ) : null}
          {clientUsers.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">{t("noUsersYet")}</p>
          ) : (
            <ul className="grid gap-2">
              {clientUsers.map((user) => (
                <ClientUserRow
                  key={user.id}
                  user={user}
                  disabled={busyAction?.id === user.id}
                  isRemoving={
                    busyAction?.id === user.id && busyAction.action === "remove"
                  }
                  isResending={
                    busyAction?.id === user.id && busyAction.action === "resend"
                  }
                  onRemove={handleRemoveUser}
                  onResend={handleResendInvite}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
