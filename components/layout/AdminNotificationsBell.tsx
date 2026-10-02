"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BellIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useUserProfile } from "@/lib/auth/use-user-profile"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { MessageKey } from "@/lib/i18n"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type AlertItem = {
  code: string
  severity: string
  titleKey: string
  bodyKey?: string
  /** Where the alert should lead; falls back to the Meta instant forms page. */
  href?: string
  organizationSlug: string
}

export function AdminNotificationsBell() {
  const { t } = useLanguage()
  const { role, loading } = useUserProfile()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (loading || role !== "censio_admin") return
    void fetch("/api/admin/notifications")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.alerts) setAlerts(data.alerts as AlertItem[])
      })
      .catch(() => undefined)
  }, [loading, role])

  if (loading || role !== "censio_admin") return null

  const count = alerts.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("adminNotificationsTitle")}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <BellIcon className="size-5" aria-hidden="true" />
        {count > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold">
          {t("adminNotificationsTitle")}
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {alerts.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              {t("adminNotificationsEmpty")}
            </li>
          ) : (
            alerts.map((alert, index) => (
              <li key={`${alert.organizationSlug}-${alert.code}-${index}`}>
                <Link
                  href={
                    alert.href ??
                    adminClientSettingsSectionPath(alert.organizationSlug, "meta-instant-forms")
                  }
                  className="block px-3 py-2.5 text-sm hover:bg-muted/50"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">{alert.organizationSlug}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {t(alert.titleKey as MessageKey)}
                    {alert.bodyKey ? `: ${alert.bodyKey}` : null}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
