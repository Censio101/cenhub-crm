"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type AdminClientSwitchContextValue = {
  switchingSlug: string | null
  beginSwitch: (slug: string) => void
  endSwitch: () => void
}

const AdminClientSwitchContext = createContext<AdminClientSwitchContextValue | null>(null)

export function AdminClientSwitchProvider({ children }: { children: ReactNode }) {
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)

  const beginSwitch = useCallback((slug: string) => {
    setSwitchingSlug(slug)
  }, [])

  const endSwitch = useCallback(() => {
    setSwitchingSlug(null)
  }, [])

  const value = useMemo(
    () => ({ switchingSlug, beginSwitch, endSwitch }),
    [switchingSlug, beginSwitch, endSwitch]
  )

  return (
    <AdminClientSwitchContext.Provider value={value}>{children}</AdminClientSwitchContext.Provider>
  )
}

export function useAdminClientSwitch() {
  const context = useContext(AdminClientSwitchContext)
  if (!context) {
    throw new Error("useAdminClientSwitch must be used within AdminClientSwitchProvider")
  }
  return context
}

export function useOptionalAdminClientSwitch() {
  return useContext(AdminClientSwitchContext)
}
