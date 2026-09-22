"use client"

import { useCallback, useEffect, useState } from "react"

import {
  getCustomersCache,
  hasCustomersCache,
  setCustomersCache,
} from "@/lib/data/client-cache"
import { MOCK_CUSTOMERS, type Customer } from "@/lib/customers"

type CustomersResponse = {
  customers: Customer[]
  source: "mock" | "supabase"
  organization?: {
    id: string
    slug: string
    name: string
    demoMode: boolean
  }
}

export function useCustomers() {
  const cached = getCustomersCache()
  const [customers, setCustomers] = useState<Customer[]>(() => cached?.customers ?? [])
  const [organizationName, setOrganizationName] = useState<string | null>(
    () => cached?.organizationName ?? null
  )
  const [loading, setLoading] = useState(() => !hasCustomersCache())
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => cached?.source ?? "mock"
  )

  const loadCustomers = useCallback(async () => {
    const showLoading = !hasCustomersCache()
    if (showLoading) setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/customers", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Kunne ikke hente kunder")
      }

      const data = (await response.json()) as CustomersResponse
      setCustomers(data.customers)
      setDataSource(data.source)
      setOrganizationName(data.organization?.name ?? null)
      setCustomersCache({
        customers: data.customers,
        source: data.source,
        organizationName: data.organization?.name ?? null,
      })
    } catch (loadError) {
      console.error(loadError)
      setCustomers(MOCK_CUSTOMERS)
      setDataSource("mock")
      setOrganizationName(null)
      setCustomersCache({
        customers: MOCK_CUSTOMERS,
        source: "mock",
        organizationName: null,
      })
      setError("Viser demo-data — database ikke tilgængelig")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  return {
    customers,
    organizationName,
    loading,
    error,
    dataSource,
    reload: loadCustomers,
  }
}
