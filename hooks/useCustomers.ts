"use client"

import { useCallback, useEffect, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import {
  CLIENT_ORG_CHANGED_EVENT,
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
  error?: string
  message?: string
}

async function shouldUseMockFallback(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" })
    if (!response.ok) return false
    const data = (await response.json()) as {
      isDemoFallback?: boolean
      userId?: string | null
    }
    return Boolean(data.isDemoFallback && !data.userId)
  } catch {
    return false
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
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => cached?.source ?? "mock"
  )

  const loadCustomers = useCallback(async () => {
    const showLoading = !hasCustomersCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const response = await fetch("/api/customers", { cache: "no-store" })
      const data = (await response.json()) as CustomersResponse

      if (!response.ok) {
        if (data.error === NO_ACTIVE_ORGANIZATION_ERROR) {
          setCustomers([])
          setOrganizationName(null)
          setDataSource("supabase")
          setNeedsClientSelection(true)
          setError(data.message ?? "Vælg en klient for at se deres dashboard.")
          setCustomersCache({
            customers: [],
            source: "supabase",
            organizationName: null,
          })
          return
        }

        if (await shouldUseMockFallback()) {
          setCustomers(MOCK_CUSTOMERS)
          setDataSource("mock")
          setOrganizationName(null)
          setCustomersCache({
            customers: MOCK_CUSTOMERS,
            source: "mock",
            organizationName: null,
          })
          setError("Viser demo-data — database ikke tilgængelig")
          return
        }

        throw new Error(data.message ?? "Kunne ikke hente kunder")
      }

      setCustomers(data.customers)
      setDataSource(data.source)
      setOrganizationName(data.organization?.name ?? null)
      setCustomersCache({
        customers: data.customers,
        source: data.source,
        organizationName: data.organization?.name ?? null,
        organizationSlug: data.organization?.slug ?? null,
      })
    } catch (loadError) {
      console.error(loadError)
      if (await shouldUseMockFallback()) {
        setCustomers(MOCK_CUSTOMERS)
        setDataSource("mock")
        setOrganizationName(null)
        setCustomersCache({
          customers: MOCK_CUSTOMERS,
          source: "mock",
          organizationName: null,
        })
        setError("Viser demo-data — database ikke tilgængelig")
      } else {
        setCustomers([])
        setDataSource("supabase")
        setError(
          loadError instanceof Error ? loadError.message : "Kunne ikke hente kunder"
        )
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    const onOrgChanged = () => {
      void loadCustomers()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [loadCustomers])

  return {
    customers,
    organizationName,
    loading,
    error,
    needsClientSelection,
    dataSource,
    reload: loadCustomers,
  }
}
