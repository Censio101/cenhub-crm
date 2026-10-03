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
import type { PublicSessionUser } from "@/lib/onboarding/types"
import { SERVICES } from "@/lib/performance/services"

type AccountSettingsContextValue = {
  settings: AccountSettings
  useDemoData: boolean
  workspaceReady: boolean
  isCensioAdmin: boolean
  user: PublicSessionUser | null
  refreshUser: () => Promise<void>
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
  const [useDemoData, setUseDemoData] = useState(true)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [persistRemote, setPersistRemote] = useState(false)
  const [isCensioAdmin, setIsCensioAdmin] = useState(false)
  const [user, setUser] = useState<PublicSessionUser | null>(null)

  const refreshUser = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" })
    const payload = (await response.json()) as { user?: PublicSessionUser | null }
    if (payload.user) {
      setUser(payload.user)
      setIsCensioAdmin(payload.user.globalRole === "censio_admin")
    } else {
      setUser(null)
      setIsCensioAdmin(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" })
        if (response.status === 401) {
          setUser(null)
          setIsCensioAdmin(false)
          setSettings(readAccountSettings())
          return
        }
        const payload = (await response.json()) as {
          settings?: AccountSettings
          workspace?: { useDemoData?: boolean }
          user?: PublicSessionUser | null
        }
        const remote = payload.settings
        const demo = payload.workspace?.useDemoData !== false
        setUseDemoData(demo)
        setPersistRemote(!demo)
        setUser(payload.user ?? null)
        setIsCensioAdmin(payload.user?.globalRole === "censio_admin")
        if (demo) {
          const local = readAccountSettings()
          setSettings({
            ...remote,
            ...local,
            companyName: local.companyName || remote?.companyName || local.companyName,
          })
        } else if (remote) {
          setSettings(remote)
        }
      } catch {
        setSettings(readAccountSettings())
      } finally {
        setWorkspaceReady(true)
      }
    })()
  }, [])

  const persist = useCallback(
    (next: AccountSettings) => {
      if (persistRemote) {
        void fetch("/api/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: next.companyName,
            email: next.email,
            logo: next.logo,
            profileImage: next.profileImage,
            enabledServiceIds: next.enabledServiceIds,
            customServices: next.customServices,
            hvidbjergPartner: next.hvidbjergPartner,
          }),
        })
        return
      }
      writeAccountSettings(next)
    },
    [persistRemote]
  )

  const updateSettings = useCallback(
    (patch: Partial<AccountSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const addEmployee = useCallback(
    (employee: Omit<EmployeeAccess, "id" | "status">) => {
      if (persistRemote) {
        void (async () => {
          const response = await fetch("/api/workspace/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(employee),
          })
          const payload = (await response.json()) as { settings?: AccountSettings }
          if (payload.settings) setSettings(payload.settings)
        })()
        return
      }
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
    [persistRemote]
  )

  const addService = useCallback(
    (id: string) => {
      setSettings((current) => {
        const enabledServiceIds = addEnabledServiceId(current.enabledServiceIds, id)
        if (enabledServiceIds.length === current.enabledServiceIds.length) {
          return current
        }
        const next = { ...current, enabledServiceIds }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const addCustomService = useCallback(
    (label: string) => {
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
          persist(next)
          return next
        }

        const service = createCustomService(trimmed, catalog)
        added = true
        const next = {
          ...current,
          customServices: [...current.customServices, service],
          enabledServiceIds: [...current.enabledServiceIds, service.id],
        }
        persist(next)
        return next
      })
      return added
    },
    [persist]
  )

  const removeService = useCallback(
    (id: string) => {
      setSettings((current) => {
        const next = {
          ...current,
          enabledServiceIds: removeEnabledServiceId(current.enabledServiceIds, id),
          customServices: current.customServices.filter((service) => service.id !== id),
        }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const value = useMemo(
    () => ({
      settings,
      useDemoData,
      workspaceReady,
      isCensioAdmin,
      user,
      refreshUser,
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
      isCensioAdmin,
      refreshUser,
      removeService,
      settings,
      updateSettings,
      useDemoData,
      user,
      workspaceReady,
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
