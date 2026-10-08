"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { recordRecentClientSlug, readRecentClientSlugs } from "@/lib/admin/client-picker-recents"
import type { PickerOrganization } from "@/lib/admin/client-picker"

type AdminClientAutoSelectContextValue = {
  autoSelecting: boolean
}

const AdminClientAutoSelectContext = createContext<AdminClientAutoSelectContextValue>({
  autoSelecting: false,
})

export function useAdminClientAutoSelect() {
  return useContext(AdminClientAutoSelectContext)
}

function orderSlugsForAutoSelect(organizations: readonly PickerOrganization[]): string[] {
  const available = new Set(organizations.map((org) => org.slug))
  const ordered: string[] = []

  for (const slug of readRecentClientSlugs()) {
    if (available.has(slug)) ordered.push(slug)
  }
  for (const org of organizations) {
    if (!ordered.includes(org.slug)) ordered.push(org.slug)
  }
  return ordered
}

export function AdminClientAutoSelectProvider({ children }: { children: ReactNode }) {
  const { role, organization, loading, needsClientSelection, setActiveOrganization } =
    useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()
  const [autoSelecting, setAutoSelecting] = useState(false)
  const inFlightRef = useRef(false)

  const runAutoSelect = useCallback(async () => {
    const slugs = orderSlugsForAutoSelect(pickerOrganizations)
    if (!slugs.length) return

    inFlightRef.current = true
    setAutoSelecting(true)
    try {
      for (const slug of slugs) {
        const ok = await setActiveOrganization(slug)
        if (ok) {
          recordRecentClientSlug(slug)
          return
        }
      }
    } finally {
      inFlightRef.current = false
      setAutoSelecting(false)
    }
  }, [pickerOrganizations, setActiveOrganization])

  useEffect(() => {
    if (organization) {
      setAutoSelecting(false)
      return
    }
    if (loading || listLoading) return
    if (role !== "censio_admin") return
    if (!needsClientSelection) return
    if (pickerOrganizations.length === 0) return
    if (inFlightRef.current) return

    void runAutoSelect()
  }, [
    organization,
    loading,
    listLoading,
    role,
    needsClientSelection,
    pickerOrganizations,
    runAutoSelect,
  ])

  return (
    <AdminClientAutoSelectContext.Provider value={{ autoSelecting }}>
      {children}
    </AdminClientAutoSelectContext.Provider>
  )
}
