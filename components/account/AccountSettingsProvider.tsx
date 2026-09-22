"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  DEFAULT_ACCOUNT_SETTINGS,
  addEnabledServiceId,
  createCustomService,
  getAvailableServices,
  getEnabledServices,
  readAccountSettings,
  removeEnabledServiceId,
  writeAccountSettings,
  type AccountSettings,
  type EmployeeAccess,
} from "@/lib/account-settings"
import { SERVICES } from "@/lib/performance/services"

type AccountSettingsContextValue = {
  settings: AccountSettings
  updateSettings: (patch: Partial<AccountSettings>) => void
  addEmployee: (employee: Omit<EmployeeAccess, "id" | "status">) => void
  addService: (id: string) => void
  addCustomService: (label: string) => boolean
  removeService: (id: string) => void
}

const AccountSettingsContext = createContext<AccountSettingsContextValue | null>(
  null
)

export function AccountSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<AccountSettings>(
    DEFAULT_ACCOUNT_SETTINGS
  )

  useEffect(() => {
    setSettings(readAccountSettings())
  }, [])

  const updateSettings = useCallback((patch: Partial<AccountSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      writeAccountSettings(next)
      return next
    })
  }, [])

  const addEmployee = useCallback(
    (employee: Omit<EmployeeAccess, "id" | "status">) => {
      setSettings((current) => {
        const next: AccountSettings = {
          ...current,
          employees: [
            ...current.employees,
            {
              ...employee,
              id: `employee-${Date.now()}`,
              status: "invited",
            },
          ],
        }
        writeAccountSettings(next)
        return next
      })
    },
    []
  )

  const addService = useCallback((id: string) => {
    setSettings((current) => {
      const enabledServiceIds = addEnabledServiceId(current.enabledServiceIds, id)
      if (enabledServiceIds.length === current.enabledServiceIds.length) {
        return current
      }
      const next = { ...current, enabledServiceIds }
      writeAccountSettings(next)
      return next
    })
  }, [])

  const addCustomService = useCallback((label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return false

    let added = false
    setSettings((current) => {
      const catalog = [...SERVICES, ...current.customServices]
      const match = catalog.find(
        (service) => service.label.toLowerCase() === trimmed.toLowerCase()
      )
      if (match) {
        if (current.enabledServiceIds.includes(match.id)) return current
        added = true
        const next = {
          ...current,
          enabledServiceIds: current.enabledServiceIds.includes(match.id)
            ? current.enabledServiceIds
            : [...current.enabledServiceIds, match.id],
        }
        writeAccountSettings(next)
        return next
      }

      const service = createCustomService(trimmed, catalog)
      added = true
      const next = {
        ...current,
        customServices: [...current.customServices, service],
        enabledServiceIds: [...current.enabledServiceIds, service.id],
      }
      writeAccountSettings(next)
      return next
    })
    return added
  }, [])

  const removeService = useCallback((id: string) => {
    setSettings((current) => {
      const next = {
        ...current,
        enabledServiceIds: removeEnabledServiceId(current.enabledServiceIds, id),
        customServices: current.customServices.filter((service) => service.id !== id),
      }
      writeAccountSettings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      addEmployee,
      addService,
      addCustomService,
      removeService,
    }),
    [
      addCustomService,
      addEmployee,
      addService,
      removeService,
      settings,
      updateSettings,
    ]
  )

  return (
    <AccountSettingsContext.Provider value={value}>
      {children}
    </AccountSettingsContext.Provider>
  )
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext)
  if (!context) {
    throw new Error("useAccountSettings skal bruges inde i AccountSettingsProvider")
  }
  return context
}

export function useCompanyServices() {
  const { settings, addService, addCustomService, removeService } =
    useAccountSettings()
  const enabledServiceIds = settings.enabledServiceIds
  const customServices = settings.customServices
  const enabledServices = useMemo(
    () => getEnabledServices(enabledServiceIds, customServices),
    [customServices, enabledServiceIds]
  )
  const availableServices = useMemo(
    () => getAvailableServices(enabledServiceIds),
    [enabledServiceIds]
  )

  return {
    enabledServiceIds,
    enabledServices,
    availableServices,
    addService,
    addCustomService,
    removeService,
  }
}
