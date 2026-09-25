"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  listPickerOrganizations,
  type PickerOrganization,
} from "@/lib/admin/client-picker"
import type { HubClient } from "@/lib/admin/hub-clients"

type UseAdminOrganizationListResult = {
  pickerOrganizations: PickerOrganization[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useAdminOrganizationList(): UseAdminOrganizationListResult {
  const [clients, setClients] = useState<HubClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations/picker", { cache: "no-store" })
      if (!response.ok) {
        setError("fetch_failed")
        setClients([])
        return
      }
      const data = (await response.json()) as { clients?: HubClient[] }
      setClients(data.clients ?? [])
    } catch {
      setError("fetch_failed")
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const pickerOrganizations = useMemo(
    () => listPickerOrganizations(clients),
    [clients]
  )

  return { pickerOrganizations, loading, error, reload }
}
