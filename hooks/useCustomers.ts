"use client"

import { useCallback, useEffect, useState } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getCustomersCache,
  hasCustomersCache,
  setCustomersCache,
} from "@/lib/data/client-cache"
import { fetchJsonDeduped } from "@/lib/data/in-flight"
import { createRequestGuard } from "@/lib/data/request-guard"
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
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null
  const [customers, setCustomers] = useState<Customer[]>(
    () => getCustomersCache(activeSlug)?.customers ?? []
  )
  const [organizationName, setOrganizationName] = useState<string | null>(
    () => getCustomersCache(activeSlug)?.organizationName ?? null
  )
  const [loading, setLoading] = useState(() => !hasCustomersCache(activeSlug))
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => getCustomersCache(activeSlug)?.source ?? "supabase"
  )
  const [guard] = useState(createRequestGuard)

  useEffect(() => () => guard.dispose(), [guard])

  const loadCustomers = useCallback(async () => {
    const isCurrent = guard.begin()
    const showLoading = !hasCustomersCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const result = await fetchJsonDeduped<CustomersResponse>("/api/customers")
      if (!isCurrent()) return
      const data = result.data

      if (!result.ok || !data) {
        if (data?.error === NO_ACTIVE_ORGANIZATION_ERROR) {
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
      if (!isCurrent()) return
      console.error(loadError)
      // Keep the customers already on screen; only surface the error (with a retry in the UI).
      setError("customersLoadError")
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [guard])

  useAsyncEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    const onOrgChanged = () => {
      // Drop the previous client's customers immediately; never show them while the new client loads.
      setCustomers([])
      setOrganizationName(null)
      setLoading(true)
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
