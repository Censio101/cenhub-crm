"use client"

import { useCallback, useEffect, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getCustomersCache,
  hasCustomersCache,
  setCustomersCache,
} from "@/lib/data/client-cache"
import type { Customer } from "@/lib/customers"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

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

export function useCustomers() {
  const cached = getCustomersCache()
  const [customers, setCustomers] = useState<Customer[]>(() => cached?.customers ?? [])
  const [organizationName, setOrganizationName] = useState<string | null>(
    () => cached?.organizationName ?? null
  )
  const [loading, setLoading] = useState(() => !hasCustomersCache())
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => cached?.source ?? "supabase"
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
          setError("leadsSelectClient")
          setCustomersCache({
            customers: [],
            source: "supabase",
            organizationName: null,
          })
          return
        }

        throw new Error("customersLoadError")
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
      setCustomers([])
      setDataSource("supabase")
      setError("customersLoadError")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useAsyncEffect(() => {
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
