"use client"

import { useCallback, useEffect, useState } from "react"

import {
  DEFAULT_ADMIN_ACCOUNT_SETTINGS,
  readAdminAccountSettings,
  writeAdminAccountSettings,
  type AdminAccountSettings,
} from "@/lib/admin/admin-account-settings"

export function useAdminAccountSettings() {
  const [settings, setSettings] = useState<AdminAccountSettings>(
    DEFAULT_ADMIN_ACCOUNT_SETTINGS
  )

  useEffect(() => {
    setSettings(readAdminAccountSettings())
  }, [])

  const updateSettings = useCallback((patch: Partial<AdminAccountSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      writeAdminAccountSettings(next)
      return next
    })
  }, [])

  return { settings, updateSettings }
}
