"use client"

import { createContext, useContext, type ReactNode } from "react"

type AdminClientAutoSelectContextValue = {
  /** Reserved for explicit client-switch flows; admins pick a client manually when none is active. */
  autoSelecting: boolean
}

const AdminClientAutoSelectContext = createContext<AdminClientAutoSelectContextValue>({
  autoSelecting: false,
})

export function useAdminClientAutoSelect() {
  return useContext(AdminClientAutoSelectContext)
}

/** Wraps client dashboard shell; does not auto-open a client (use cookie restore or Vælg klient). */
export function AdminClientAutoSelectProvider({ children }: { children: ReactNode }) {
  return (
    <AdminClientAutoSelectContext.Provider value={{ autoSelecting: false }}>
      {children}
    </AdminClientAutoSelectContext.Provider>
  )
}
