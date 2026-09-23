"use client"

import { useCallback, useEffect, useState } from "react"
import { MailIcon, RotateCwIcon, ShieldCheckIcon, Trash2Icon, UsersIcon } from "lucide-react"

import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm"
import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminAccountSettings } from "@/hooks/useAdminAccountSettings"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import {
  adminInitials,
  formatAdminDisplayName,
} from "@/lib/admin/format-admin-display-name"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type CensioAdmin = {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  createdAt: string
  accessStatus: "active" | "pending"
}

function AdminAvatar({
  image,
  initials,
}: {
  image: string | null
  initials: string
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="size-11 shrink-0 rounded-full object-cover ring-1 ring-[#e8e0d8]"
      />
    )
  }

  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-sm font-semibold tracking-wide text-white"
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

function AdminListSkeleton() {
  return (
    <ul className="grid gap-3" aria-hidden="true">
      {Array.from({ length: 2 }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-xl border border-[#e8e0d8] bg-white px-4 py-3.5"
        >
          <div className="size-11 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function AdminListRow({
  admin,
  isCurrentUser,
  localProfileImage,
  onRemove,
  onResend,
  disabled,
}: {
  admin: CensioAdmin
  isCurrentUser: boolean
  localProfileImage?: string
  onRemove: (admin: CensioAdmin) => void
  onResend: (admin: CensioAdmin) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const displayName = formatAdminDisplayName(admin)
  const initials = adminInitials(admin)
  const profileImage =
    admin.avatarUrl || (isCurrentUser && localProfileImage ? localProfileImage : null)
  const isPending = admin.accessStatus === "pending"

  return (
    <li className="flex items-center gap-3.5 rounded-xl border border-[#e8e0d8] bg-white px-4 py-3.5 transition-colors hover:border-[#d3c3b2] hover:bg-[#faf8f6]/40">
      <AdminAvatar image={profileImage} initials={initials} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-foreground">{displayName}</p>
          {isCurrentUser ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {t("adminListYou")}
            </span>
          ) : null}
          {isPending ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {t("adminInvitePending")}
            </span>
          ) : null}
        </div>
        {admin.email ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <MailIcon className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate">{admin.email}</span>
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 px-3 text-[13px]"
            disabled={disabled}
            onClick={() => onResend(admin)}
          >
            <RotateCwIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("adminResendInvite")}</span>
          </Button>
        ) : (
          <span className="hidden items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary sm:inline-flex">
            <ShieldCheckIcon className="size-3" aria-hidden="true" />
            {t("roleCensioAdmin")}
          </span>
        )}

        {!isCurrentUser ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 w-9 shrink-0 px-0 text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            aria-label={t("adminRemoveAdmin")}
            disabled={disabled}
            onClick={() => onRemove(admin)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function AdminAdminsPanel() {
  const { t } = useLanguage()
  const { settings: adminAccountSettings } = useAdminAccountSettings()
  const [admins, setAdmins] = useState<CensioAdmin[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null)

  const dismissActionNotice = useCallback(() => setActionNotice(null), [])
  const dismissActionError = useCallback(() => setActionError(null), [])

  useAutoDismiss(actionNotice, dismissActionNotice)
  useAutoDismiss(actionError, dismissActionError, 6000)

  async function loadAdmins() {
    setLoading(true)
    setError(null)
    try {
      const [adminsResponse, meResponse] = await Promise.all([
        fetch("/api/admin/admins", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ])
      if (!adminsResponse.ok) throw new Error(t("errorLoadAdmins"))
      const data = (await adminsResponse.json()) as { admins: CensioAdmin[] }
      setAdmins(data.admins)

      if (meResponse.ok) {
        const me = (await meResponse.json()) as { userId?: string | null }
        setCurrentUserId(me.userId ?? null)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("errorLoadAdmins"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAdmins()
  }, [])

  async function handleRemoveAdmin(admin: CensioAdmin) {
    const label = admin.email ?? formatAdminDisplayName(admin)
    if (!window.confirm(t("adminRemoveConfirm", { email: label }))) return

    setBusyAdminId(admin.id)
    setActionError(null)
    setActionNotice(null)

    try {
      const response = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("adminRemoveError"))

      setActionNotice(t("adminRemoved", { email: label }))
      await loadAdmins()
    } catch (removeError) {
      setActionError(
        removeError instanceof Error ? removeError.message : t("adminRemoveError")
      )
    } finally {
      setBusyAdminId(null)
    }
  }

  async function handleResendInvite(admin: CensioAdmin) {
    setBusyAdminId(admin.id)
    setActionError(null)
    setActionNotice(null)

    try {
      const response = await fetch(`/api/admin/admins/${admin.id}/resend`, { method: "POST" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("adminResendError"))

      setActionNotice(t("adminResent", { email: admin.email ?? "" }))
    } catch (resendError) {
      setActionError(
        resendError instanceof Error ? resendError.message : t("adminResendError")
      )
    } finally {
      setBusyAdminId(null)
    }
  }

  const countLabel =
    admins.length === 1
      ? t("adminsCount", { count: admins.length })
      : t("adminsCountPlural", { count: admins.length })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("brand")}
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          {t("inviteAdminPageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("inviteAdminPageDescription")}</p>
      </header>

      <AdminInviteUserForm
        mode="admin"
        onInvited={() => {
          void loadAdmins()
        }}
      />

      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={adminIconBoxClass("brand")} aria-hidden="true">
              <UsersIcon className="size-[18px]" />
            </span>
            <h2 className="text-base font-semibold text-foreground">{t("censioAdminsListTitle")}</h2>
          </div>
          {!loading && !error && admins.length > 0 ? (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-muted-foreground ring-1 ring-[#e8e0d8]">
              {countLabel}
            </span>
          ) : null}
        </div>

        <div className="bg-[#faf8f6]/30 px-4 py-4 sm:px-5">
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
          {loading ? (
            <AdminListSkeleton />
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800" role="alert">
              {error}
            </p>
          ) : admins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d3c3b2] bg-white px-6 py-10 text-center">
              <ShieldCheckIcon className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">{t("noAdminsYet")}</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {admins.map((admin) => (
                <AdminListRow
                  key={admin.id}
                  admin={admin}
                  isCurrentUser={admin.id === currentUserId}
                  localProfileImage={
                    admin.id === currentUserId ? adminAccountSettings.profileImage : undefined
                  }
                  onRemove={handleRemoveAdmin}
                  onResend={handleResendInvite}
                  disabled={busyAdminId === admin.id}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
