"use client"

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react"

import {
  parseAccountSettings,
  readAccountSettings,
  readAccountSettingsRaw,
  writeAccountSettings,
  type AccountSettings,
  type EmployeeAccess,
} from "@/lib/account-settings"
import { subscribeToStorage } from "@/lib/react/storage-store"

type AccountSettingsContextValue = {
  settings: AccountSettings
  updateSettings: (patch: Partial<AccountSettings>) => void
  addEmployee: (employee: Omit<EmployeeAccess, "id" | "status">) => void
}

const AccountSettingsContext = createContext<AccountSettingsContextValue | null>(null)

export function AccountSettingsProvider({ children }: { children: React.ReactNode }) {
  // Stored in localStorage: the server and first client render use the defaults, the saved
  // settings are read right after hydration and follow changes from this and other tabs.
  const raw = useSyncExternalStore(subscribeToStorage, readAccountSettingsRaw, () => null)
  const settings = useMemo(() => parseAccountSettings(raw), [raw])

  const updateSettings = useCallback((patch: Partial<AccountSettings>) => {
    writeAccountSettings({ ...readAccountSettings(), ...patch })
  }, [])

  const addEmployee = useCallback((employee: Omit<EmployeeAccess, "id" | "status">) => {
    const current = readAccountSettings()
    writeAccountSettings({
      ...current,
      employees: [
        ...current.employees,
        {
          ...employee,
          id: `employee-${Date.now()}`,
          status: "invited",
        },
      ],
    })
  }, [])

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      addEmployee,
    }),
    [addEmployee, settings, updateSettings]
  )

  return <AccountSettingsContext.Provider value={value}>{children}</AccountSettingsContext.Provider>
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext)
  if (!context) {
    throw new Error("useAccountSettings skal bruges inde i AccountSettingsProvider")
  }
  return context
}
