"use client"

import { UsersIcon } from "lucide-react"

import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm"
import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

export function AdminClientUsersPanel() {
  const { t } = useLanguage()
  const { organization, users, reload } = useAdminClient()

  if (!organization) return null

  return (
    <div className="grid gap-5">
      <AdminInviteUserForm
        mode="client"
        organizationId={organization.id}
        clientName={organization.name}
        onInvited={() => {
          void reload()
        }}
      />

      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
          <span className={adminIconBoxClass("neutral")} aria-hidden="true">
            <UsersIcon className="size-[18px]" />
          </span>
          <h2 className="text-base font-semibold text-foreground">{t("usersTitle")}</h2>
        </div>
        <div className="px-5 py-4">
          {users.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">{t("noUsersYet")}</p>
          ) : (
            <ul className="grid gap-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#e8e0d8] bg-white px-3.5 py-2.5"
                >
                  <p className="truncate text-[14px] font-medium text-foreground">
                    {user.email ?? user.full_name ?? user.id}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#faf8f6] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase">
                    {user.role.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
